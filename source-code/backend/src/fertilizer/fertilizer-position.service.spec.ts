import { formatBatchId } from './fertilizer-map';
import { positionStatus } from './fertilizer-position.service';
import {
  buildFertilizerHarness,
  NOW,
  officer,
} from './testing/fertilizer-harness';

/** TODAY in the harness is 2026-10-09. */
const IN_20_DAYS = '2026-10-29';
const IN_70_DAYS = '2026-12-18';
const LONG_AGO = '2026-07-04';

async function approve(
  h: ReturnType<typeof buildFertilizerHarness>,
  qty: number,
) {
  const id = await h.request(qty);
  await h.requestService.decide(id, { decision: 'approve' }, officer, NOW);
  return id;
}

describe('FertilizerPositionService — one source for stock status', () => {
  it('keeps expired stock out of On Hand and Available, and reports it separately', async () => {
    const h = buildFertilizerHarness();
    h.batch({ qty: 700, expiry: IN_70_DAYS });
    h.batch({ qty: 120, expiry: LONG_AGO }); // expired, not written off
    const gone = h.batch({ qty: 50, expiry: LONG_AGO });
    gone.discarded = true; // written off — not "expired stock" any more
    expect(await h.position()).toMatchObject({
      onHand: 700,
      available: 700,
      expiredKg: 120,
    });
  });

  it('TSP-like data — Available 0, nothing pending — is Fully committed, never Healthy', async () => {
    const h = buildFertilizerHarness();
    h.batch({ qty: 200, expiry: IN_70_DAYS });
    await approve(h, 200);
    expect(await h.position()).toMatchObject({
      available: 0,
      status: 'Fully committed',
    });
  });

  it('Out of stock when Available is 0 and requests wait; Short X kg when they want more than is free', async () => {
    const h = buildFertilizerHarness();
    h.batch({ qty: 200, expiry: IN_70_DAYS });
    await approve(h, 200);
    await h.request(77);
    expect(await h.position()).toMatchObject({
      status: 'Out of stock',
      shortKg: 77,
    });

    const h2 = buildFertilizerHarness();
    h2.batch({ qty: 100, expiry: IN_70_DAYS });
    await h2.request(150);
    expect(await h2.position()).toMatchObject({ status: 'Short', shortKg: 50 });
  });

  it('applies the rules worst-first', () => {
    const s = (available: number, pendingDemand: number, expiringSoonKg = 0) =>
      positionStatus({ available, pendingDemand, expiringSoonKg }).status;
    expect(s(0, 10)).toBe('Out of stock');
    expect(s(-40, 0)).toBe('Short'); // committed stock has since expired
    expect(s(5, 10)).toBe('Short');
    expect(s(0, 0)).toBe('Fully committed');
    expect(s(100, 10, 50)).toBe('Expiring soon');
    expect(s(100, 10)).toBe('Healthy');
  });

  it('the expiring-soon window comes from settings', async () => {
    const at30 = buildFertilizerHarness();
    at30.batch({ qty: 300, expiry: IN_20_DAYS });
    expect(await at30.position()).toMatchObject({
      status: 'Expiring soon',
      expiringSoonKg: 300,
      nearestExpiry: IN_20_DAYS,
      expiringSoonDays: 30,
    });

    const at14 = buildFertilizerHarness({ expiringSoonDays: 14 });
    at14.batch({ qty: 300, expiry: IN_20_DAYS });
    expect(await at14.position()).toMatchObject({
      status: 'Healthy',
      expiringSoonKg: 0,
    });
  });

  it('a request is "covered" when FEFO takes fresh stock — an expiring batch promised to others does not count', async () => {
    const h = buildFertilizerHarness();
    const soon = h.batch({ qty: 500, expiry: IN_20_DAYS });
    const later = h.batch({ qty: 500, expiry: IN_70_DAYS });
    await approve(h, 500); // takes the expiring batch (FEFO)
    const id = await h.request(30);

    const row = (await h.view.list(NOW)).find((r) => r.id === id)!;
    expect(row.availability).toMatchObject({
      verdict: 'covered',
      expiringBatch: null,
      fefo: [{ batchId: formatBatchId(later.id), take: 30 }],
    });
    // FERT-01 still flags the item: live stock (the committed batch) expires soon
    expect((await h.position()).status).toBe('Expiring soon');
    void soon;
  });

  it('"covered-expiring" names the batch it would take, with days left', async () => {
    const h = buildFertilizerHarness();
    h.batch({ qty: 500, expiry: IN_20_DAYS });
    const id = await h.request(30);
    const row = (await h.view.list(NOW)).find((r) => r.id === id)!;
    expect(row.availability).toMatchObject({
      verdict: 'covered-expiring',
      expiringBatch: { expiryDate: IN_20_DAYS, daysToExpiry: 20 },
    });
  });

  it('partial / none / none-expired', async () => {
    const h = buildFertilizerHarness();
    h.batch({ qty: 40, expiry: IN_70_DAYS });
    const partial = await h.request(100);
    expect(
      (await h.view.list(NOW)).find((r) => r.id === partial)!.availability,
    ).toMatchObject({ verdict: 'partial', available: 40 });

    const expired = buildFertilizerHarness();
    expired.batch({ qty: 300, expiry: LONG_AGO });
    const id = await expired.request(77);
    expect(
      (await expired.view.list(NOW)).find((r) => r.id === id)!.availability!
        .verdict,
    ).toBe('none-expired');
  });

  it('every screen reads the same numbers: positions, batches and requests agree', async () => {
    const h = buildFertilizerHarness();
    const b = h.batch({ qty: 500, expiry: IN_20_DAYS });
    await approve(h, 200);
    const id = await h.request(30);

    const position = await h.position();
    const request = (await h.view.list(NOW)).find((r) => r.id === id)!;
    const snap = await h.positions.snapshot(NOW);
    const batch = h.positions.batchView(b, snap);

    expect(request.availability!.available).toBe(position.available);
    expect(batch).toEqual({
      status: 'Expiring soon',
      daysToExpiry: 20,
      freeKg: 300,
    });
    expect(position.status).toBe('Expiring soon');
    expect(request.availability!.verdict).toBe('covered-expiring');
  });

  it('only Requested requests carry an availability verdict', async () => {
    const h = buildFertilizerHarness();
    h.batch({ qty: 500, expiry: IN_70_DAYS });
    const id = await approve(h, 100);
    expect(
      (await h.view.list(NOW)).find((r) => r.id === id)!.availability,
    ).toBeNull();
  });
});
