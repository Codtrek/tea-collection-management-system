import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AppRole } from '../auth/role-map';
import type { RecordMovementDto } from './dto/record-movement.dto';
import { formatBatchId } from './fertilizer-map';
import {
  buildFertilizerHarness,
  NOW,
  officer,
  TODAY,
} from './testing/fertilizer-harness';

/** FERT-01/02/03 — batches, stock movements and the position arithmetic. */
const asActor = (a: { name: string; role: string }) => ({
  name: a.name,
  role: a.role as AppRole,
});
const managerActor = { name: 'R. Jayasuriya', role: 'Manager' as AppRole };

function outgoing(
  batchId: string,
  qty: number,
  extra: Partial<RecordMovementDto> = {},
): RecordMovementDto {
  return {
    type: 'Outgoing',
    batchId,
    quantityKg: qty,
    date: TODAY,
    destination: 'Green Valley Estate',
    ...extra,
  };
}

describe('FertilizerService', () => {
  describe('listPositions — the stock arithmetic', () => {
    it('On Hand = live batches; Committed = active FEFO allocations; Requested is pending demand', async () => {
      const h = buildFertilizerHarness();
      h.permanent(1, 1);
      h.batch({ qty: 700, expiry: '2027-01-01' });
      h.batch({ qty: 120, expiry: '2026-07-04' }); // expired — not on hand
      const approved = await h.request(400);
      await h.requestService.decide(
        approved,
        { decision: 'approve' },
        officer,
        NOW,
      );
      await h.request(300); // still Requested

      expect(await h.position()).toMatchObject({
        onHand: 700,
        committed: 400,
        available: 300,
        pendingDemand: 300,
        status: 'Healthy',
      });
    });

    it('goes negative when committed stock has since expired — a shortfall to resolve', async () => {
      const h = buildFertilizerHarness();
      const b = h.batch({ qty: 500, expiry: '2027-01-01' });
      const id = await h.request(400);
      await h.requestService.decide(id, { decision: 'approve' }, officer, NOW);
      b.expiryDate = '2026-10-01'; // the batch expires before pickup
      expect(await h.position()).toMatchObject({
        onHand: 0,
        committed: 400,
        available: -400,
        status: 'Short',
      });
    });

    it('excludes discarded batches from on-hand', async () => {
      const h = buildFertilizerHarness();
      const b = h.batch({ qty: 500, expiry: '2027-01-01' });
      await h.stock.discardBatch(formatBatchId(b.id), asActor(officer));
      expect(await h.position()).toMatchObject({ onHand: 0 });
    });
  });

  describe('recordMovement — Incoming', () => {
    it('rejects Manager (data-driven fertilizer: view)', async () => {
      const h = buildFertilizerHarness();
      const b = h.batch({ qty: 100, expiry: '2027-01-01' });
      await expect(
        h.stock.recordMovement(
          {
            type: 'Incoming',
            batchId: formatBatchId(b.id),
            quantityKg: 10,
            date: TODAY,
          },
          managerActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('restocks an existing batch', async () => {
      const h = buildFertilizerHarness();
      const b = h.batch({ qty: 100, expiry: '2027-01-01' });
      await h.stock.recordMovement(
        {
          type: 'Incoming',
          batchId: formatBatchId(b.id),
          quantityKg: 50,
          date: TODAY,
        },
        asActor(officer),
      );
      expect(b.quantityKg).toBe('150');
    });

    it('creates a new batch when no batchId is given', async () => {
      const h = buildFertilizerHarness();
      const m = await h.stock.recordMovement(
        {
          type: 'Incoming',
          quantityKg: 250,
          date: TODAY,
          item: 'Dolomite',
          expiryDate: '2027-06-01',
          lotNumber: 'LOT-D-1',
        },
        asActor(officer),
      );
      expect(m.type).toBe('Incoming');
      expect(h.batches.rows).toEqual([
        expect.objectContaining({ item: 'Dolomite', quantityKg: '250' }),
      ]);
    });

    it('rejects restocking a discarded batch', async () => {
      const h = buildFertilizerHarness();
      const b = h.batch({ qty: 100, expiry: '2027-01-01' });
      b.discarded = true;
      await expect(
        h.stock.recordMovement(
          {
            type: 'Incoming',
            batchId: formatBatchId(b.id),
            quantityKg: 10,
            date: TODAY,
          },
          asActor(officer),
        ),
      ).rejects.toThrow(/discarded/);
    });
  });

  describe('recordMovement — Outgoing (ad-hoc only)', () => {
    it('refuses a request-linked dispatch — requests leave through their delivery handover', async () => {
      const h = buildFertilizerHarness();
      const b = h.batch({ qty: 500, expiry: '2027-01-01' });
      await expect(
        h.stock.recordMovement(
          outgoing(formatBatchId(b.id), 100, { linkedRequest: 'FR-2026-0001' }),
          asActor(officer),
        ),
      ).rejects.toThrow(/delivery/);
    });

    it('never dips into stock committed to approved requests', async () => {
      const h = buildFertilizerHarness();
      h.permanent(1, 1);
      const b = h.batch({ qty: 500, expiry: '2027-01-01' });
      const id = await h.request(400);
      await h.requestService.decide(id, { decision: 'approve' }, officer, NOW);
      await expect(
        h.stock.recordMovement(
          outgoing(formatBatchId(b.id), 150),
          asActor(officer),
        ),
      ).rejects.toThrow(/Only 100 kg of this batch is free/);
      await h.stock.recordMovement(
        outgoing(formatBatchId(b.id), 100),
        asActor(officer),
      );
      expect(b.quantityKg).toBe('400');
    });

    it('rejects a movement with no destination or no batch', async () => {
      const h = buildFertilizerHarness();
      const b = h.batch({ qty: 500, expiry: '2027-01-01' });
      await expect(
        h.stock.recordMovement(
          outgoing(formatBatchId(b.id), 10, { destination: undefined }),
          asActor(officer),
        ),
      ).rejects.toThrow(ConflictException);
      await expect(
        h.stock.recordMovement(
          outgoing(undefined as unknown as string, 10),
          asActor(officer),
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('writes a charge for an ad-hoc dispatch billed to an estate, none without a rate', async () => {
      const h = buildFertilizerHarness();
      const b = h.batch({ qty: 500, expiry: '2027-01-01' });
      await h.stock.recordMovement(
        outgoing(formatBatchId(b.id), 10),
        asActor(officer),
      );
      expect(h.charges.rows).toHaveLength(0);
      await h.stock.recordMovement(
        outgoing(formatBatchId(b.id), 20, {
          estateId: 'EST-0002',
          ratePerKg: 90,
        }),
        asActor(officer),
      );
      expect(h.charges.rows).toEqual([
        expect.objectContaining({
          estateId: 2,
          fertilizerRequestId: null,
          totalCharge: '1800',
        }),
      ]);
    });
  });

  describe('discardBatch', () => {
    it('rejects Manager', async () => {
      const h = buildFertilizerHarness();
      const b = h.batch({ qty: 100, expiry: '2027-01-01' });
      await expect(
        h.stock.discardBatch(formatBatchId(b.id), managerActor),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('not found', () => {
    it('rejects an unknown or malformed batch id', async () => {
      const h = buildFertilizerHarness();
      await expect(h.stock.getBatch('FB-9999')).rejects.toThrow(
        NotFoundException,
      );
      await expect(h.stock.getBatch('nonsense')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
