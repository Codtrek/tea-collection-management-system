import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { AppRole } from '../auth/role-map';
import { formatBatchId } from './fertilizer-map';
import { batchCover } from './fertilizer-position.service';
import {
  at,
  buildFertilizerHarness,
  manager,
  NOW,
  officer,
} from './testing/fertilizer-harness';

/** Expiry Alerts, Write off and expired-allocation guards (Fertilizer-Delivery-Addendum §5.2). */
const actor = (a: { name: string; role: string }) => ({
  name: a.name,
  role: a.role as AppRole,
});
// TODAY is 2026-10-09; the harness runs every route daily.
const D1 = '2026-10-10';

describe('expiryAlerts — buckets', () => {
  it('expired, within 7 days and within the window never overlap', async () => {
    const h = buildFertilizerHarness();
    h.batch({ qty: 300, expiry: '2026-10-01', lot: 'EXP' });
    h.batch({ qty: 0, expiry: '2026-10-02', lot: 'EMPTY' }); // nothing left — no alert
    h.batch({ qty: 200, expiry: '2026-10-09', lot: 'TODAY' }); // last day: still live
    h.batch({ qty: 100, expiry: '2026-10-16', lot: 'D7' });
    h.batch({ qty: 150, expiry: '2026-10-17', lot: 'D8' });
    h.batch({ qty: 50, expiry: '2026-11-08', lot: 'D30' });
    h.batch({ qty: 999, expiry: '2026-11-09', lot: 'D31' }); // outside the window

    const res = await h.stock.expiryAlerts(NOW);

    expect(res.summary).toEqual({
      expired: { count: 1, kg: 300 },
      soon: { count: 2, kg: 300 },
      later: { count: 2, kg: 200 },
    });
    const lots = (bucket: string) =>
      res.batches.filter((b) => b.bucket === bucket).map((b) => b.lotNumber);
    expect(lots('expired')).toEqual(['EXP']);
    expect(lots('soon')).toEqual(['TODAY', 'D7']);
    expect(lots('later')).toEqual(['D8', 'D30']);
    expect(res.batches).toHaveLength(5);
  });
});

describe('expiryAlerts — can fully cover', () => {
  it('walks open requests oldest first and never exceeds the batch quantity', async () => {
    const h = buildFertilizerHarness();
    h.batch({ qty: 1000, expiry: '2027-06-01' });
    for (const qty of [100, 400]) {
      const id = await h.request(qty);
      await h.requestService.decide(id, { decision: 'approve' }, officer, NOW);
    }
    h.batch({ qty: 300, expiry: '2026-10-14', lot: 'SOON' });
    await h.request(77);
    await h.request(100);

    const res = await h.stock.expiryAlerts(NOW);
    const soon = res.batches.find((b) => b.lotNumber === 'SOON')!;
    // 100 ✓ (200 left) · 400 ✗ · 77 ✓ (123 left) · 100 ✓ (23 left)
    expect(soon.cover).toEqual({ count: 3, coveredKg: 277, requestedKg: 677 });
    expect(soon.cover!.coveredKg).toBeLessThanOrEqual(soon.quantityKg);
  });

  it('an expired batch covers nothing', async () => {
    const h = buildFertilizerHarness();
    h.batch({ qty: 300, expiry: '2026-08-10' });
    await h.request(77);
    const res = await h.stock.expiryAlerts(NOW);
    expect(res.batches[0]).toMatchObject({ bucket: 'expired', cover: null });
  });

  it('batchCover is bounded by the batch for any demand', () => {
    const demand = [730, 30, 400, 300, 1, 499].map((needKg, id) => ({
      requestedDate: '2026-10-01',
      id,
      needKg,
    }));
    for (const kg of [0, 1, 30, 299.5, 500, 5000]) {
      const c = batchCover(kg, demand);
      expect(c.coveredKg).toBeLessThanOrEqual(kg);
      expect(c.requestedKg).toBe(1960);
    }
  });
});

describe('writeOffBatch', () => {
  it('writes a Write-off movement and lowers Expired by the same kg', async () => {
    const h = buildFertilizerHarness();
    const b = h.batch({ qty: 300, expiry: '2026-10-01' });
    expect(await h.position()).toMatchObject({ expiredKg: 300 });

    await h.stock.writeOffBatch(
      formatBatchId(b.id),
      { reason: 'expired', quantityKg: 100 },
      actor(officer),
      NOW,
    );
    expect(await h.position()).toMatchObject({ expiredKg: 200 });

    // the default quantity is everything left
    await h.stock.writeOffBatch(
      formatBatchId(b.id),
      { reason: 'expired' },
      actor(officer),
      NOW,
    );
    expect(await h.position()).toMatchObject({ expiredKg: 0 });
    expect(h.movements.rows).toEqual([
      expect.objectContaining({
        type: 'Write-off',
        writeOffReason: 'expired',
        quantityKg: '100',
      }),
      expect.objectContaining({ type: 'Write-off', quantityKg: '200' }),
    ]);
    expect((await h.stock.expiryAlerts(NOW)).summary.expired).toEqual({
      count: 0,
      kg: 0,
    });
    expect(h.audit.record).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: officer.name }),
      expect.objectContaining({ action: 'Wrote off fertilizer batch stock' }),
    );
  });

  it('is blocked while the expired batch is still allocated, and names the requests', async () => {
    const h = buildFertilizerHarness();
    const b = h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.request(200);
    await h.requestService.decide(id, { decision: 'approve' }, officer, NOW);
    b.expiryDate = '2026-10-01'; // expires after approval

    const attempt = h.stock.writeOffBatch(
      formatBatchId(b.id),
      { reason: 'expired' },
      actor(officer),
      NOW,
    );
    await expect(attempt).rejects.toThrow(ConflictException);
    await expect(attempt).rejects.toMatchObject({
      response: { requests: [{ id, kg: 200 }] },
    });
    const alert = (await h.stock.expiryAlerts(NOW)).batches[0];
    expect(alert.allocatedTo).toEqual([{ requestId: id, kg: 200 }]);
    expect((await h.view.list(NOW)).find((r) => r.id === id)).toMatchObject({
      staleCommittedKg: 200,
    });

    // move it to live stock, then the write-off goes through
    h.batch({ qty: 400, expiry: '2027-02-01' });
    const moved = await h.delivery.moveToLive(id, officer, NOW);
    expect(moved).toMatchObject({ committedKg: 200, staleCommittedKg: 0 });
    await h.stock.writeOffBatch(
      formatBatchId(b.id),
      { reason: 'expired' },
      actor(officer),
      NOW,
    );
    expect(await h.position()).toMatchObject({
      expiredKg: 0,
      onHand: 400,
      committed: 200,
    });
  });

  it('on a live batch only the free kg can go', async () => {
    const h = buildFertilizerHarness();
    const b = h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.request(400);
    await h.requestService.decide(id, { decision: 'approve' }, officer, NOW);
    await expect(
      h.stock.writeOffBatch(
        formatBatchId(b.id),
        { reason: 'damaged', quantityKg: 150 },
        actor(officer),
        NOW,
      ),
    ).rejects.toThrow(/Only 100 kg/);
    await h.stock.writeOffBatch(
      formatBatchId(b.id),
      { reason: 'damaged', quantityKg: 100 },
      actor(officer),
      NOW,
    );
    expect(await h.position()).toMatchObject({ onHand: 400, available: 0 });
  });
});

describe('moveToLive', () => {
  it('refuses when live stock cannot replace the expired commitment', async () => {
    const h = buildFertilizerHarness();
    const b = h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.request(200);
    await h.requestService.decide(id, { decision: 'approve' }, officer, NOW);
    b.expiryDate = '2026-10-01';
    await expect(h.delivery.moveToLive(id, officer, NOW)).rejects.toThrow(
      /live stock can't replace it/,
    );
  });

  it('needs fertilizer: edit', async () => {
    const h = buildFertilizerHarness();
    h.batch({ qty: 500, expiry: '2027-01-01' });
    const id = await h.request(200);
    await expect(h.delivery.moveToLive(id, manager, NOW)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('expired stock never leaves the factory', () => {
  it('handover re-commits from live stock when the batch expired after approval', async () => {
    const h = buildFertilizerHarness();
    h.permanent(1, 1);
    const old = h.batch({ qty: 500, expiry: '2026-10-09', lot: 'OLD' }); // last day today
    const fresh = h.batch({ qty: 500, expiry: '2027-01-01', lot: 'NEW' });
    const id = await h.ready(200); // FEFO takes OLD
    expect(h.allocations.rows[0].batchId).toBe(old.id);

    const res = await h.delivery.handover(id, 200, officer, at(D1)); // OLD expired overnight
    expect(res.status).toBe('Picked up');
    const out = h.movements.rows.filter((m) => m.type === 'Outgoing');
    expect(out.map((m) => m.batchId)).toEqual([fresh.id]);
    expect(Number(old.quantityKg)).toBe(500);
  });

  it('handover is refused when no live stock can replace it', async () => {
    const h = buildFertilizerHarness();
    h.permanent(1, 1);
    h.batch({ qty: 500, expiry: '2026-10-09' });
    const id = await h.ready(200);
    await expect(h.delivery.handover(id, 200, officer, at(D1))).rejects.toThrow(
      /expired batch/,
    );
  });

  it('ad-hoc Outgoing refuses an expired batch', async () => {
    const h = buildFertilizerHarness();
    const b = h.batch({ qty: 300, expiry: '2026-07-04' });
    await expect(
      h.stock.recordMovement(
        {
          type: 'Outgoing',
          batchId: formatBatchId(b.id),
          quantityKg: 10,
          date: '2026-10-09',
          destination: 'Green Valley Estate',
        },
        actor(officer),
      ),
    ).rejects.toThrow(/can't be dispatched/);
  });
});
