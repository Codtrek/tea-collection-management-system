import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { fertilizerOutstanding } from './fertilizer-balance';
import {
  assertTransition,
  attemptLabel,
  paymentStatus,
} from './fertilizer-flow';
import { planFefo } from './fertilizer-stock-ledger.service';
import {
  admin,
  at,
  buildFertilizerHarness,
  manager,
  NOW,
  officer,
  TODAY,
} from './testing/fertilizer-harness';

// TODAY (2026-10-09) is a Friday. Every route runs daily in the harness, so markReady lands on
// the next day; agent 1 permanently holds Route 1 (Green Valley's route) unless a spec says not.
const D1 = '2026-10-10';
const D2 = '2026-10-11';
const D3 = '2026-10-12';

function scenario(settings = {}) {
  const h = buildFertilizerHarness(settings);
  h.permanent(1, 1);
  h.permanent(2, 2);
  return h;
}

describe('1. approval commits stock FEFO', () => {
  it('a partial approval commits exactly the approved quantity, earliest expiry first', async () => {
    const h = scenario();
    const later = h.batch({ qty: 300, expiry: '2027-03-01', lot: 'LATE' });
    const sooner = h.batch({ qty: 200, expiry: '2026-12-01', lot: 'SOON' });
    const id = await h.request(400);

    await expect(
      h.requestService.decide(
        id,
        { decision: 'approve', approvedQtyKg: 350 },
        officer,
        NOW,
      ),
    ).rejects.toThrow(/reason for the partial approval/);

    const res = await h.requestService.decide(
      id,
      {
        decision: 'approve',
        approvedQtyKg: 350,
        reason: 'Stock is tight this month',
      },
      officer,
      NOW,
    );
    expect(res).toMatchObject({
      status: 'Partially approved',
      approvedQtyKg: 350,
      committedKg: 350,
      decisionReason: 'Stock is tight this month',
      ratePerKg: 90,
    });
    expect(res.allocations).toEqual([
      expect.objectContaining({
        lotNumber: 'SOON',
        qtyKg: 200,
        state: 'active',
      }),
      expect.objectContaining({
        lotNumber: 'LATE',
        qtyKg: 150,
        state: 'active',
      }),
    ]);
    expect(await h.position()).toMatchObject({
      onHand: 500,
      committed: 350,
      available: 150,
    });
    expect(sooner.quantityKg).toBe('200'); // approval moves nothing physically
    expect(later.quantityKg).toBe('300');
  });

  it('two requests can never be promised the same stock', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const a = await h.request(400);
    const b = await h.request(200, { estateId: 2 });
    await h.requestService.decide(a, { decision: 'approve' }, officer, NOW);
    await expect(
      h.requestService.decide(b, { decision: 'approve' }, officer, NOW),
    ).rejects.toThrow(/Only 100 kg of Urea Fertilizer is available/);
    expect((await h.entity(b)).status).toBe('Requested');
    expect(await h.position()).toMatchObject({
      committed: 400,
      available: 100,
    });
  });

  it('ignores expired and discarded batches', async () => {
    const h = scenario();
    h.batch({ qty: 300, expiry: '2026-09-01' }); // already expired
    const discarded = h.batch({ qty: 300, expiry: '2027-01-01' });
    discarded.discarded = true;
    h.batch({ qty: 100, expiry: '2027-01-01' });
    const id = await h.request(150);
    await expect(
      h.requestService.decide(id, { decision: 'approve' }, officer, NOW),
    ).rejects.toThrow(ConflictException);
  });

  it('rejection needs a reason, commits nothing and tells the owner', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.request(100);
    await expect(
      h.requestService.decide(id, { decision: 'reject' }, officer, NOW),
    ).rejects.toThrow(BadRequestException);
    const res = await h.requestService.decide(
      id,
      { decision: 'reject', reason: 'Duplicate request' },
      officer,
      NOW,
    );
    expect(res).toMatchObject({
      status: 'Rejected',
      committedKg: 0,
      decisionReason: 'Duplicate request',
    });
    expect(h.notices.rows.map((n) => n.kind)).toEqual(['rejected']);
  });

  it('refuses approval when the item has no price', async () => {
    const h = scenario();
    h.batch({ item: 'Dolomite', qty: 500, expiry: '2027-01-01' });
    const id = await h.request(100, {});
    const dolomite = await h.requestService.createRequests(
      {
        estateId: 1,
        items: [{ item: 'Dolomite', quantityKg: 100 }],
        paymentMethod: 'cash',
      },
      'web',
      officer,
      NOW,
    );
    await expect(
      h.requestService.decide(
        dolomite.requests[0].id,
        { decision: 'approve' },
        officer,
        NOW,
      ),
    ).rejects.toThrow(/No price is set for Dolomite/);
    expect(id).toBeDefined();
  });

  it('above the limit the Officer commits stock and a Factory Manager signs off', async () => {
    const h = scenario();
    h.batch({ qty: 1000, expiry: '2027-01-01' });
    const id = await h.request(600);
    const pending = await h.requestService.decide(
      id,
      { decision: 'approve' },
      officer,
      NOW,
    );
    expect(pending).toMatchObject({
      status: 'Awaiting manager approval',
      committedKg: 600,
      needsManager: true,
    });
    expect(h.notices.rows).toHaveLength(0); // the owner hears once it's final

    // separation of duties, data-driven
    await expect(
      h.requestService.managerDecide(id, { decision: 'approve' }, officer, NOW),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      h.requestService.decide(
        await h.request(10),
        { decision: 'approve' },
        manager,
        NOW,
      ),
    ).rejects.toThrow(ForbiddenException);

    const done = await h.requestService.managerDecide(
      id,
      { decision: 'approve' },
      manager,
      NOW,
    );
    expect(done).toMatchObject({
      status: 'Approved',
      managerDecidedBy: 'R. Jayasuriya',
    });
    expect(h.notices.rows.map((n) => n.kind)).toEqual(['approved']);
  });

  it('a manager rejection releases the committed stock', async () => {
    const h = scenario();
    h.batch({ qty: 1000, expiry: '2027-01-01' });
    const id = await h.request(600);
    await h.requestService.decide(id, { decision: 'approve' }, officer, NOW);
    const res = await h.requestService.managerDecide(
      id,
      { decision: 'reject', reason: 'Owner is over his credit limit' },
      manager,
      NOW,
    );
    expect(res).toMatchObject({ status: 'Rejected', committedKg: 0 });
    expect(await h.position()).toMatchObject({ committed: 0, available: 1000 });
  });
});

describe('2. dispatch follows the route', () => {
  it('goes on the estate’s stop on the route’s next collection day', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    h.pattern(1, [1, 4]); // Route 1: Mon/Thu — today is Friday
    const id = await h.ready(200);
    const r = await h.view.detail(id);
    expect(r).toMatchObject({
      status: 'Ready for dispatch',
      attemptLabel: 'Attempt 1 of 3',
    });
    expect(r.attempt).toMatchObject({
      scheduledDate: D3,
      routeName: 'Route 1',
      agentId: 1,
      pinned: false,
    });
    expect(h.notices.rows.map((n) => [n.kind, n.payload.date])).toEqual([
      ['approved', undefined],
      ['dispatched', D3],
    ]);
  });

  it('a task follows a cover agent before pickup, then stays with whoever picked it up', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200); // attempt on D1
    const cover = h.cover(1, 3, 'ACTIVE', { validFrom: D1, validTo: D1 });

    expect(
      (await h.delivery.agentTasks(h.uid(3), at(D1))).map((t) => t.requestId),
    ).toEqual([id]);
    expect(await h.delivery.agentTasks(h.uid(1), at(D1))).toEqual([]);
    expect((await h.view.detail(id)).attempt).toMatchObject({
      agentId: 3,
      covering: true,
    });

    await h.delivery.handover(id, 200, officer, at(D1));
    cover.status = 'CANCELLED'; // the cover ends after pickup…
    expect((await h.delivery.agentTasks(h.uid(3), at(D1)))[0]).toMatchObject({
      stage: 'carrying',
      qtyKg: 200,
    });
    expect(await h.delivery.agentTasks(h.uid(1), at(D1))).toEqual([]); // …the fertilizer stays with agent 3
  });

  it('moves to the next collection day when its date is taken off the route schedule', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200); // D1
    await h.schedule.addOverride(
      1,
      { date: D1, kind: 'CANCEL', reason: 'Poya day' },
      officer as never,
      NOW,
    );
    await h.delivery.reconcile(NOW);
    expect((await h.view.detail(id)).attempt?.scheduledDate).toBe(D2);
    expect(
      h.notices.rows
        .filter((n) => n.kind === 'dispatched')
        .map((n) => n.payload.date),
    ).toEqual([D1, D2]);
  });

  it('an officer can move the delivery to today, but only to a day the route runs', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200);
    h.pattern(1, [5, 6]); // Fri (today) / Sat (D1)
    await expect(
      h.delivery.changeDate(id, D2, 'x', officer, NOW),
    ).rejects.toThrow(/doesn't run on 2026-10-11/);
    const res = await h.delivery.changeDate(
      id,
      TODAY,
      'Owner needs it before the rain',
      officer,
      NOW,
    );
    expect(res.attempt?.scheduledDate).toBe(TODAY);
  });

  it('only the agent who has it can act on it', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200);
    const attempt = await h.openAttempt(id);
    await expect(h.delivered(1, attempt.id, 200, at(D1))).rejects.toThrow(
      /handover yet/,
    );
    await h.delivery.handover(id, 200, officer, at(D1));
    await expect(h.delivered(2, attempt.id, 200, at(D1))).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('3. pickup', () => {
  it('lowers On Hand and Committed by the handed-over quantity', async () => {
    const h = scenario();
    const b = h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200);
    expect(await h.position('Urea Fertilizer', at(D1))).toMatchObject({
      onHand: 500,
      committed: 200,
      available: 300,
    });

    await expect(h.delivery.handover(id, 150, officer, at(D1))).rejects.toThrow(
      /hand over exactly that/,
    );
    const res = await h.delivery.handover(id, 200, officer, at(D1));

    expect(res).toMatchObject({ status: 'Picked up', committedKg: 0 });
    expect(res.attempt).toMatchObject({
      pinned: true,
      agentId: 1,
      handoverQtyKg: 200,
    });
    expect(await h.position('Urea Fertilizer', at(D1))).toMatchObject({
      onHand: 300,
      committed: 0,
      available: 300,
    });
    expect(b.quantityKg).toBe('300');
    expect(h.movements.rows).toEqual([
      expect.objectContaining({
        type: 'Outgoing',
        quantityKg: '200',
        linkedRequestId: (await h.entity(id)).id,
      }),
    ]);
  });

  it('flags a mismatch when the agent confirms a different quantity (evidence only)', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200);
    const attempt = await h.openAttempt(id);
    await h.delivery.handover(id, 200, officer, at(D1));
    const task = await h.delivery.agentPickup(
      h.uid(1),
      attempt.id,
      { qtyKg: 180, recordedAt: at(D1).toISOString(), syncKey: 'pickup-key-1' },
      at(D1),
    );
    expect(task.agentConfirmQtyKg).toBe(180);
    const r = await h.view.detail(id);
    expect(r.pickupMismatch).toBe(true);
    expect(r.committedKg).toBe(0); // stock moved at the handover, not here
    expect(await h.position('Urea Fertilizer', at(D1))).toMatchObject({
      onHand: 300,
    });
  });

  it('goes Out for delivery when the agent starts his route', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200);
    await h.delivery.handover(id, 200, officer, at(D1));
    await h.self.startShift(h.uid(1), at(D1));
    expect((await h.entity(id)).status).toBe('Out for delivery');
  });

  it('is already Out for delivery when handed over after the route started', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200);
    await h.self.startShift(h.uid(1), at(D1));
    await h.delivery.handover(id, 200, officer, at(D1));
    expect((await h.entity(id)).status).toBe('Out for delivery');
  });
});

describe('delivery at the estate', () => {
  it('needs the owner’s name and confirmation, and is applied once per sync key', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200);
    const attempt = await h.openAttempt(id);
    await h.delivery.handover(id, 200, officer, at(D1));
    await expect(
      h.delivery.agentDelivered(
        h.uid(1),
        attempt.id,
        {
          deliveredQtyKg: 200,
          ownerName: 'K. Perera',
          ownerConfirmed: false,
          photo: { takenAt: at(D1).toISOString() },
          recordedAt: at(D1).toISOString(),
          syncKey: 'k-unconfirmed',
        },
        at(D1),
      ),
    ).rejects.toThrow(/confirm receipt/);

    // offline: recorded at 09:30 on the phone, synced in the evening — twice
    const evening = new Date(`${D1}T13:00:00.000Z`);
    await h.delivered(1, attempt.id, 200, at(D1), { syncKey: 'k-offline-1' });
    await h.delivery.agentDelivered(
      h.uid(1),
      attempt.id,
      {
        deliveredQtyKg: 200,
        ownerName: 'K. Perera',
        ownerConfirmed: true,
        photo: { takenAt: at(D1).toISOString() },
        recordedAt: at(D1).toISOString(),
        syncKey: 'k-offline-1',
      },
      evening,
    );
    expect(h.charges.rows).toHaveLength(1);
    const r = await h.view.detail(id);
    expect(r.status).toBe('Delivered');
    expect(r.attempts[0]).toMatchObject({
      ownerName: 'K. Perera',
      ownerConfirmedAt: at(D1).toISOString(),
      recordedAt: at(D1).toISOString(),
      photos: [
        expect.objectContaining({
          label: 'Delivery photo',
          takenBy: 'R. Senanayake',
        }),
      ],
    });
    expect(r.timeline.at(-1)).toMatchObject({
      action: 'Delivered — owner confirmed',
      deviceAt: at(D1).toISOString(),
    });
  });
});

describe('4–5. failure, check-in and redelivery', () => {
  it('a failed delivery stays committed to the owner after check-in', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200);
    const attempt = await h.openAttempt(id);
    await h.delivery.handover(id, 200, officer, at(D1));
    await h.failed(1, attempt.id, at(D1));
    expect((await h.entity(id)).status).toBe('Failed');

    await expect(h.delivery.checkIn(id, 150, officer, at(D1))).rejects.toThrow(
      /bring back 200 kg/,
    );
    const res = await h.delivery.checkIn(id, 200, officer, at(D1));

    expect(res).toMatchObject({
      status: 'Rescheduled',
      committedKg: 200,
      attemptLabel: 'Attempt 2 of 3',
    });
    expect(res.attempt).toMatchObject({
      attemptNo: 2,
      scheduledDate: D2,
      pinned: false,
    });
    expect(await h.position('Urea Fertilizer', at(D1))).toMatchObject({
      onHand: 500,
      committed: 200,
      available: 300,
    });
    const failedNotice = h.notices.rows.find((n) => n.kind === 'failed')!;
    expect(failedNotice.payload).toMatchObject({
      reason: 'Owner not available',
      date: D1,
      newDate: D2,
    });
    expect(res.timeline.map((e) => e.toStatus)).toEqual(
      expect.arrayContaining(['Failed', 'Returned to factory', 'Rescheduled']),
    );
  });

  it('the 3rd failure moves to Needs review; retry starts a new cycle', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200);
    for (const day of [D1, D2, D3]) {
      const attempt = await h.openAttempt(id);
      expect(attempt.scheduledDate).toBe(day);
      await h.delivery.handover(id, 200, officer, at(day));
      await h.failed(1, attempt.id, at(day));
      await h.delivery.checkIn(id, 200, officer, at(day));
    }
    const review = await h.view.detail(id);
    expect(review).toMatchObject({
      status: 'Needs review',
      committedKg: 200,
      attemptLabel: null,
    });
    expect(
      h.notices.rows.filter((n) => n.kind === 'failed').at(-1)!.payload.newDate,
    ).toBeNull();

    const retried = await h.delivery.retry(id, undefined, officer, at(D3));
    expect(retried).toMatchObject({
      status: 'Rescheduled',
      attemptLabel: 'Attempt 1 of 3',
    });
    expect(retried.attempt).toMatchObject({
      attemptNo: 4,
      scheduledDate: '2026-10-13',
    });
  });
});

describe('6. cancel', () => {
  it('releases the committed stock and tells the owner', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200);
    expect(await h.position()).toMatchObject({ available: 300 });
    await expect(h.requestService.cancel(id, '', officer, NOW)).rejects.toThrow(
      BadRequestException,
    );
    const res = await h.requestService.cancel(
      id,
      'Owner sold the estate',
      officer,
      NOW,
    );
    expect(res).toMatchObject({ status: 'Cancelled', committedKg: 0 });
    expect(res.attempt?.cancelled).toBe(true);
    expect(await h.position()).toMatchObject({ committed: 0, available: 500 });
    const last = h.notices.rows.at(-1)!;
    expect(last.kind).toBe('cancelled');
    expect(last.payload.reason).toBe('Owner sold the estate');
  });

  it('can’t cancel what is with an agent', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200);
    await h.delivery.handover(id, 200, officer, at(D1));
    await expect(
      h.requestService.cancel(id, 'x', officer, at(D1)),
    ).rejects.toThrow(/agent has this fertilizer/);
  });
});

describe('7–8. price snapshot and amount owed', () => {
  it('the price is fixed at approval — a later price change doesn’t touch it', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200);
    await h.requestService.setPrice(
      { item: 'Urea Fertilizer', ratePerKg: 120, effectiveDate: TODAY },
      admin,
      NOW,
    );
    expect(
      (await h.requestService.currentPrice('Urea Fertilizer', TODAY))
        ?.ratePerKg,
    ).toBe('120');

    await h.delivery.handover(id, 200, officer, at(D1));
    const attempt = await h.openAttempt(id);
    await h.delivered(1, attempt.id, 200, at(D1));
    const r = await h.view.detail(id);
    expect(r.ratePerKg).toBe(90);
    expect(r.charges).toEqual([
      expect.objectContaining({ ratePerKg: 90, totalRs: 18_000 }),
    ]);
  });

  it('only an Administrator sets prices, never in the past', async () => {
    const h = scenario();
    await expect(
      h.requestService.setPrice(
        { item: 'Urea Fertilizer', ratePerKg: 95, effectiveDate: D1 },
        officer,
        NOW,
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      h.requestService.setPrice(
        { item: 'Urea Fertilizer', ratePerKg: 95, effectiveDate: '2026-10-01' },
        admin,
        NOW,
      ),
    ).rejects.toThrow(/past/);
  });

  it('amount owed uses the delivered quantity (partial approval, then partial delivery)', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.request(400, { method: 'cash' });
    await h.requestService.decide(
      id,
      { decision: 'approve', approvedQtyKg: 300, reason: 'Limited stock' },
      officer,
      NOW,
    );
    await h.delivery.markReady(id, officer, NOW);
    await h.delivery.handover(id, 300, officer, at(D1));
    const attempt = await h.openAttempt(id);
    await expect(h.delivered(1, attempt.id, 250, at(D1))).rejects.toThrow(
      /Why the rest/,
    );
    await h.delivered(1, attempt.id, 250, at(D1), {
      shortfallReason: 'Owner has no storage for more',
    });

    let r = await h.view.detail(id);
    expect(r).toMatchObject({
      status: 'Partially delivered',
      deliveredQtyKg: 250,
    });
    expect(r.payment).toMatchObject({
      method: 'cash',
      amountOwedRs: 22_500,
      outstandingRs: 22_500,
      status: 'Unpaid',
    });
    expect(
      h.notices.rows.find((n) => n.kind === 'delivered')!.payload,
    ).toMatchObject({ qtyKg: 250, amountRs: 22_500 });

    // the 50 kg shortfall comes back and stays committed for redelivery…
    r = await h.delivery.checkIn(id, 50, officer, at(D1));
    expect(r).toMatchObject({ status: 'Rescheduled', committedKg: 50 });
    // …until the officer releases it because the owner refused it
    r = await h.delivery.releaseShortfall(
      id,
      'Owner refused the rest',
      officer,
      at(D1),
    );
    expect(r).toMatchObject({
      status: 'Delivered',
      committedKg: 0,
      deliveredQtyKg: 250,
    });
    expect(r.payment.amountOwedRs).toBe(22_500);
  });

  it('cash / bank payments reduce the outstanding balance', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(100, { method: 'bank' });
    await h.delivery.handover(id, 100, officer, at(D1));
    await h.delivered(1, (await h.openAttempt(id)).id, 100, at(D1));
    await expect(
      h.requestService.recordPayment(
        id,
        { amount: 5000, paidOn: D1, method: 'bank' },
        officer,
        at(D1),
      ),
    ).rejects.toThrow(/reference/);
    await expect(
      h.requestService.recordPayment(
        id,
        { amount: 9001, paidOn: D1, method: 'cash' },
        officer,
        at(D1),
      ),
    ).rejects.toThrow(/Only Rs. 9000/);
    let r = await h.requestService.recordPayment(
      id,
      { amount: 4000, paidOn: D1, method: 'bank', reference: 'BOC-7781' },
      officer,
      at(D1),
    );
    expect(r.payment).toMatchObject({
      paidRs: 4000,
      outstandingRs: 5000,
      status: 'Part paid',
    });
    r = await h.requestService.recordPayment(
      id,
      { amount: 5000, paidOn: D1, method: 'cash' },
      officer,
      at(D1),
    );
    expect(r.payment).toMatchObject({ outstandingRs: 0, status: 'Paid' });
  });

  it('the payment method can change until delivery, not after', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(100);
    const r = await h.requestService.setPaymentMethod(id, 'cash', officer, NOW);
    expect(r.payment.method).toBe('cash');
    await h.delivery.handover(id, 100, officer, at(D1));
    await h.delivered(1, (await h.openAttempt(id)).id, 100, at(D1));
    expect(h.charges.rows[0].paymentMethod).toBe('cash');
    await expect(
      h.requestService.setPaymentMethod(id, 'bank', officer, at(D1)),
    ).rejects.toThrow(/can't change/);
  });
});

describe('order, timeline and the agent’s stops', () => {
  it('one order creates one request per item, sharing an order reference', async () => {
    const h = scenario();
    const res = await h.requestService.createRequests(
      {
        estateId: 'EST-0001',
        items: [
          { item: 'Urea Fertilizer', quantityKg: 200 },
          { item: 'Dolomite', quantityKg: 100 },
        ],
        paymentMethod: 'cash',
        reason: 'Phoned in',
      },
      'web',
      officer,
      NOW,
    );
    expect(res.requests).toHaveLength(2);
    expect(new Set(res.requests.map((r) => r.orderRef))).toEqual(
      new Set([res.orderRef]),
    );
    expect(res.requests[0]).toMatchObject({
      routeName: 'Route 1',
      status: 'Requested',
    });
    expect(res.requests[0].payment).toMatchObject({
      method: 'cash',
      status: 'Not due',
    });
    await expect(
      h.requestService.createRequests(
        {
          estateId: 1,
          items: [{ item: 'Urea Fertilizer', quantityKg: 1 }],
          paymentMethod: 'cash',
        },
        'web',
        manager,
        NOW,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('puts fertilizer on the agent’s stop list, even at an estate with no tea pickup that day', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200); // Green Valley (estate 1) on Route 1, D1
    const stops = await h.self.myStops(h.uid(1), at(D1));
    expect(stops.stops).toEqual([
      expect.objectContaining({
        estateId: 1,
        hasTeaPickup: false,
        estateWeightKg: null,
        fertilizer: [
          expect.objectContaining({
            requestId: id,
            stage: 'awaiting_handover',
            qtyKg: 200,
          }),
        ],
      }),
    ]);
  });

  it('records who did what, when and why', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200);
    const r = await h.view.detail(id);
    expect(r.timeline.map((e) => [e.actor, e.toStatus])).toEqual([
      ['S. Fernando', 'Requested'],
      ['S. Fernando', 'Approved'],
      ['S. Fernando', 'Ready for dispatch'],
    ]);
    expect(h.audit.record).toHaveBeenCalledWith(
      officer,
      expect.objectContaining({
        action: 'Approved fertilizer request',
        module: 'Fertilizer',
      }),
    );
  });
});

describe('owner notices', () => {
  it('are stored for the owner — "Stored, not delivered" without a device, "Sent" with one', async () => {
    const h = scenario();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.ready(200);
    expect(await h.notificationService.sweep(NOW)).toBe(2);
    expect(h.notifier.deliverToUser).toHaveBeenCalledWith(
      501,
      expect.objectContaining({
        type: 'fertilizer_approval',
        title: 'Fertilizer approved: Urea Fertilizer',
      }),
    );
    expect((await h.view.detail(id)).noticeStatus).toBe(
      'Stored, not delivered',
    );

    h.tokens.seed({
      token: 'ExponentPushToken[x]',
      userId: 501,
      platform: 'android',
    } as never);
    await h.requestService.cancel(id, 'Owner changed his mind', officer, NOW);
    await h.notificationService.sweep(NOW);
    expect((await h.view.detail(id)).noticeStatus).toBe('Sent');
    expect(await h.notificationService.sweep(NOW)).toBe(0); // nothing sent twice
  });
});

describe('pure rules', () => {
  it('the status machine refuses illegal moves', () => {
    expect(() => assertTransition('Delivered', 'Cancelled')).toThrow(
      ConflictException,
    );
    expect(() => assertTransition('Picked up', 'Cancelled')).toThrow(
      ConflictException,
    );
    expect(() =>
      assertTransition('Failed', 'Returned to factory'),
    ).not.toThrow();
  });

  it('labels the attempt within the current cycle', () => {
    expect(attemptLabel('Ready for dispatch', 0, 3)).toBe('Attempt 1 of 3');
    expect(attemptLabel('Failed', 2, 3)).toBe('Attempt 2 of 3');
    expect(attemptLabel('Rescheduled', 2, 3)).toBe('Attempt 3 of 3');
    expect(attemptLabel('Delivered', 1, 3)).toBeNull();
  });

  it('outstanding = charges − settlement recoveries − cash/bank payments', () => {
    expect(
      fertilizerOutstanding(
        [
          { totalCharge: '9000', settlementId: null },
          { totalCharge: '3000', settlementId: 'SET-2026-07-001' },
        ],
        [{ amount: '2500' }],
      ),
    ).toEqual({
      chargedRs: 12_000,
      recoveredRs: 3000,
      paidRs: 2500,
      outstandingRs: 6500,
    });
    expect(
      paymentStatus('deduct', {
        amountOwedRs: 9000,
        recoveredRs: 0,
        paidRs: 0,
      }),
    ).toBe('Pending deduction');
    expect(
      paymentStatus('deduct', {
        amountOwedRs: 9000,
        recoveredRs: 9000,
        paidRs: 0,
      }),
    ).toBe('Deducted');
    expect(
      paymentStatus('cash', { amountOwedRs: 0, recoveredRs: 0, paidRs: 0 }),
    ).toBe('Not due');
  });

  it('FEFO takes the earliest-expiring live batch first and never more than is free', () => {
    const b = (id: number, qty: number, expiry: string) =>
      ({
        id,
        quantityKg: String(qty),
        expiryDate: expiry,
        discarded: false,
      }) as never;
    const batches = [
      b(1, 100, '2027-02-01'),
      b(2, 100, '2026-12-01'),
      b(3, 100, '2026-09-01'),
    ];
    expect(planFefo(batches, new Map([[2, 40]]), 120, TODAY)).toEqual([
      { batchId: 2, take: 60 },
      { batchId: 1, take: 60 },
    ]);
    expect(planFefo(batches, new Map(), 250, TODAY)).toBeNull(); // batch 3 is expired
  });
});
