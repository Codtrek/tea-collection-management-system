import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { gradedTotalKg, gradingState, isPayable } from './collection-map';
import {
  admin,
  buildGradingHarness,
  freezeClock,
  makeRecord,
  makeSettlement,
  manager,
  minutes,
  officer,
  setClock,
  T0,
} from './testing/grading-harness';

const ID = 'GV-2026-0001';

const LINES = [
  { grade: 'Super' as const, weightKg: 100 },
  { grade: 'Normal' as const, weightKg: 50 },
];

describe('grading lifecycle (OPEN → LOCKED → SETTLED)', () => {
  let h: ReturnType<typeof buildGradingHarness>;
  const record = () => h.records.rows[0];

  beforeEach(() => {
    freezeClock(T0);
    h = buildGradingHarness();
    h.records.seed(makeRecord());
  });
  afterEach(() => jest.useRealTimers());

  describe('grading', () => {
    it('confirms the record, snapshots locked_at = now + window, writes revision 1 and queues the owner notification', async () => {
      await h.grading.setGradeLines(ID, { lines: LINES }, officer);

      expect(record().status).toBe('confirmed');
      expect(record().gradedAt).toEqual(T0);
      expect(record().lockedAt).toEqual(minutes(T0, 30));
      expect(gradedTotalKg(record())).toBe(150);
      expect(record().weightKg).toBe('150.00'); // estate weight never overwritten

      expect(h.revisions.rows).toHaveLength(1);
      expect(h.revisions.rows[0]).toMatchObject({
        revisionNo: 1,
        kind: 'initial',
        changedBy: officer.name,
      });

      expect(h.outbox.rows).toHaveLength(1);
      expect(h.outbox.rows[0]).toMatchObject({
        kind: 'graded',
        status: 'queued',
        sendAfter: minutes(T0, 30),
        dedupeKey: `graded:${ID}`,
      });
    });

    it('is gated by the data-driven permission matrix, not by role names', async () => {
      await expect(
        h.grading.setGradeLines(ID, { lines: LINES }, admin),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        h.grading.setGradeLines(ID, { lines: LINES }, manager),
      ).rejects.toThrow(ForbiddenException);
      expect(record().status).toBe('collected');

      // Re-configure: give the Manager edit on grading (no code change) and they may grade.
      h.perms.rows.find(
        (p) => p.role === 'Manager' && p.module === 'grading',
      )!.level = 'edit';
      await expect(
        h.grading.setGradeLines(ID, { lines: LINES }, manager),
      ).resolves.toBeUndefined();
    });

    it('rejects two lines for the same grade and a record that is not Collected', async () => {
      await expect(
        h.grading.setGradeLines(ID, { lines: [LINES[0], LINES[0]] }, officer),
      ).rejects.toThrow(ConflictException);
      h.records.seed(makeRecord({ id: 'A', status: 'approved' }));
      await expect(
        h.grading.setGradeLines('A', { lines: LINES }, officer),
      ).rejects.toThrow(BadRequestException);
    });

    it('raises a weight-mismatch complaint only beyond the configured tolerance', async () => {
      await h.grading.setGradeLines(
        ID,
        { lines: [{ grade: 'Super', weightKg: 120 }] },
        officer,
      );
      expect(record().mismatch?.complaintId).toBe('C-1');
      expect(h.complaints.rows[0]).toMatchObject({
        type: 'weight_mismatch',
        raisedByUserId: 7,
      });

      h.records.seed(makeRecord({ id: 'B' }));
      await h.grading.setGradeLines(
        'B',
        { lines: [{ grade: 'Super', weightKg: 147 }] },
        officer,
      );
      expect(h.records.rows[1].mismatch).toBeNull();
      expect(h.complaints.rows).toHaveLength(1);
    });
  });

  describe('editing is allowed only while OPEN', () => {
    beforeEach(async () => {
      await h.grading.setGradeLines(ID, { lines: LINES }, officer);
    });

    it('edits directly inside the window with a reason: new open_edit revision, locked_at NOT extended', async () => {
      setClock(minutes(T0, 10));
      await h.grading.setGradeLines(
        ID,
        {
          lines: [
            { grade: 'Super', weightKg: 110 },
            { grade: 'Normal', weightKg: 40 },
          ],
          reason: 'Typed 100/50 by mistake',
        },
        officer,
      );
      expect(gradedTotalKg(record())).toBe(150);
      expect(
        record().gradeLines.find((l) => l.grade === 'super')?.weightKg,
      ).toBe('110');
      expect(record().lockedAt).toEqual(minutes(T0, 30));
      expect(h.revisions.rows.map((r) => [r.revisionNo, r.kind])).toEqual([
        [1, 'initial'],
        [2, 'open_edit'],
      ]);
      expect(h.revisions.rows[0].lines).toEqual(LINES); // the original revision is untouched
      expect(h.revisions.rows[1].reason).toBe('Typed 100/50 by mistake');
    });

    it('requires a reason for an open edit', async () => {
      await expect(
        h.grading.setGradeLines(ID, { lines: LINES }, officer),
      ).rejects.toThrow(BadRequestException);
    });

    it('any user with the grading permission may edit — not only the original grader', async () => {
      h.perms.seed({ role: 'Manager', module: 'grading', level: 'edit' });
      h.perms.rows.find(
        (p) => p.role === 'Manager' && p.module === 'grading',
      )!.level = 'edit';
      await h.grading.setGradeLines(
        ID,
        { lines: [{ grade: 'Super', weightKg: 150 }], reason: 'Re-weighed' },
        manager,
      );
      expect(h.revisions.rows[1].changedBy).toBe(manager.name);
    });

    it('locks once the window closes: direct edit is refused and points to a correction request', async () => {
      setClock(minutes(T0, 31));
      expect(gradingState(record())).toBe('locked');
      await expect(
        h.grading.setGradeLines(ID, { lines: LINES, reason: 'late' }, officer),
      ).rejects.toThrow(/locked/);
      expect(h.revisions.rows).toHaveLength(1);
    });

    it('Finalize locks immediately and releases the held notification', async () => {
      setClock(minutes(T0, 5));
      await h.grading.finalize(ID, officer);
      expect(gradingState(record())).toBe('locked');
      expect(record().finalizedAt).toEqual(minutes(T0, 5));
      expect(h.outbox.rows[0].sendAfter).toEqual(minutes(T0, 5));
      await expect(
        h.grading.setGradeLines(ID, { lines: LINES, reason: 'x' }, officer),
      ).rejects.toThrow(ConflictException);
      await expect(h.grading.finalize(ID, officer)).rejects.toThrow(
        ConflictException,
      );
    });

    it('a settled delivery cannot be edited directly either', async () => {
      record().settlementId = 'SET-2026-08-001';
      await expect(
        h.grading.setGradeLines(ID, { lines: LINES, reason: 'x' }, officer),
      ).rejects.toThrow(/settled/);
    });

    it('locked_at is a snapshot: changing the window setting later does not re-open or re-lock it', () => {
      h.setSetting({ correctionWindowMin: 600 });
      setClock(minutes(T0, 31));
      expect(gradingState(record())).toBe('locked'); // still locked at +31 min although the window is now 10 h

      h.setSetting({ correctionWindowMin: 1 });
      setClock(minutes(T0, 5));
      expect(gradingState(record())).toBe('open'); // still open at +5 min although the window is now 1 min
    });

    it('new gradings use the window in force at grading time', async () => {
      h.setSetting({ correctionWindowMin: 5 });
      h.records.seed(makeRecord({ id: 'W' }));
      await h.grading.setGradeLines('W', { lines: LINES }, officer);
      expect(h.records.rows[1].lockedAt).toEqual(minutes(T0, 5));
    });

    it('an edit that fixes a mismatch resolves the complaint; one that causes it raises it', async () => {
      h.records.seed(makeRecord({ id: 'M' }));
      await h.grading.setGradeLines(
        'M',
        { lines: [{ grade: 'Super', weightKg: 100 }] },
        officer,
      );
      const rec = h.records.rows[1];
      expect(rec.mismatch).not.toBeNull();
      await h.grading.setGradeLines(
        'M',
        { lines: [{ grade: 'Super', weightKg: 150 }], reason: 'typo' },
        officer,
      );
      expect(rec.mismatch).toBeNull();
      expect(
        h.complaints.rows.find((c) => c.collectionRecordId === 'M')?.status,
      ).toBe('resolved');
    });
  });

  describe('OPEN deliveries are never payable', () => {
    it('isPayable is false while OPEN, true once locked or settled', async () => {
      await h.grading.setGradeLines(ID, { lines: LINES }, officer);
      expect(isPayable(record())).toBe(false);
      setClock(minutes(T0, 31));
      expect(isPayable(record())).toBe(true);
      record().settlementId = 'S';
      expect(isPayable(record())).toBe(true);
      expect(isPayable(makeRecord({ status: 'collected' }))).toBe(false);
    });
  });

  describe('correction requests (LOCKED)', () => {
    const NEW = [
      { grade: 'Super' as const, weightKg: 120 },
      { grade: 'Normal' as const, weightKg: 30 },
    ];

    beforeEach(async () => {
      await h.grading.setGradeLines(ID, { lines: LINES }, officer);
      setClock(minutes(T0, 31));
    });

    it('is refused while the delivery is still OPEN (edit it directly)', async () => {
      setClock(minutes(T0, 5));
      await expect(
        h.grading.requestCorrection(
          ID,
          { lines: NEW, reason: 'wrong split' },
          officer,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('officer submits; nothing changes until a Manager approves; only one may be pending', async () => {
      const req = await h.grading.requestCorrection(
        ID,
        { lines: NEW, reason: 'Wrong split on the sheet' },
        officer,
      );
      expect(req).toMatchObject({
        status: 'pending',
        requestedBy: officer.name,
      });
      expect(req.impact).toMatchObject({ settled: false, adjustmentRs: 0 });
      expect(gradedTotalKg(record())).toBe(150);
      expect(
        record().gradeLines.find((l) => l.grade === 'super')?.weightKg,
      ).toBe('100');
      await expect(
        h.grading.requestCorrection(
          ID,
          { lines: NEW, reason: 'again' },
          officer,
        ),
      ).rejects.toThrow(/already waiting/);
    });

    it('refuses a request identical to the current grading', async () => {
      await expect(
        h.grading.requestCorrection(
          ID,
          { lines: LINES, reason: 'nothing' },
          officer,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('only a Manager (gradingApproval) can approve or reject — not the Officer, not the Administrator', async () => {
      const { id } = await h.grading.requestCorrection(
        ID,
        { lines: NEW, reason: 'Wrong split' },
        officer,
      );
      await expect(
        h.grading.approveCorrection(id, {}, officer),
      ).rejects.toThrow(ForbiddenException);
      await expect(h.grading.approveCorrection(id, {}, admin)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(
        h.grading.rejectCorrection(id, { note: 'no' }, admin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('approval applies the correction as a NEW revision — earlier revisions are kept, not overwritten', async () => {
      const { id } = await h.grading.requestCorrection(
        ID,
        { lines: NEW, reason: 'Wrong split' },
        officer,
      );
      setClock(minutes(T0, 60));
      await h.grading.approveCorrection(id, { note: 'ok' }, manager);

      expect(
        record().gradeLines.find((l) => l.grade === 'super')?.weightKg,
      ).toBe('120');
      expect(h.revisions.rows.map((r) => [r.revisionNo, r.kind])).toEqual([
        [1, 'initial'],
        [2, 'correction'],
      ]);
      expect(h.revisions.rows[0].lines).toEqual(LINES);
      expect(h.revisions.rows[1]).toMatchObject({
        lines: NEW,
        reason: 'Wrong split',
        changedBy: officer.name,
        approvedBy: manager.name,
        requestId: id,
      });
      expect(h.requests.rows[0]).toMatchObject({
        status: 'approved',
        decidedBy: manager.name,
        decisionNote: 'ok',
      });
      expect(h.adjustments.rows).toHaveLength(0); // not settled → no adjustment
      const revisions = await h.grading.listRevisions(ID);
      expect(revisions.map((r) => r.revisionNo)).toEqual([1, 2]);
    });

    it('rejection needs a note, changes nothing, and frees the slot for a new request', async () => {
      const { id } = await h.grading.requestCorrection(
        ID,
        { lines: NEW, reason: 'Wrong split' },
        officer,
      );
      await expect(h.grading.rejectCorrection(id, {}, manager)).rejects.toThrow(
        BadRequestException,
      );
      await h.grading.rejectCorrection(
        id,
        { note: 'Sheet matches the original' },
        manager,
      );
      expect(h.requests.rows[0].status).toBe('rejected');
      expect(h.revisions.rows).toHaveLength(1);
      await expect(
        h.grading.requestCorrection(
          ID,
          { lines: NEW, reason: 'second try' },
          officer,
        ),
      ).resolves.toBeDefined();
      await expect(
        h.grading.approveCorrection(id, {}, manager),
      ).rejects.toThrow(/already rejected/);
    });
  });

  describe('correction on a SETTLED delivery → settlement adjustment, never a rewrite', () => {
    const NEW = [
      { grade: 'Super' as const, weightKg: 120 },
      { grade: 'Normal' as const, weightKg: 30 },
    ];

    beforeEach(async () => {
      await h.grading.setGradeLines(ID, { lines: LINES }, officer);
      setClock(minutes(T0, 31));
      record().settlementId = 'SET-2026-08-001';
      h.settlements.seed(makeSettlement());
    });

    it('previews the signed amount on the pending request (Δ Super +20 kg × 185, Δ Normal −20 kg × 95 = Rs. 1,800)', async () => {
      const req = await h.grading.requestCorrection(
        ID,
        { lines: NEW, reason: 'Wrong split' },
        officer,
      );
      expect(req.impact).toEqual({
        settled: true,
        settlementId: 'SET-2026-08-001',
        adjustmentRs: 1800,
      });
    });

    it('approval creates a pending signed adjustment priced at the PAYING settlement’s rates and leaves that settlement untouched', async () => {
      const before = { ...h.settlements.rows[0] };
      const { id } = await h.grading.requestCorrection(
        ID,
        { lines: NEW, reason: 'Wrong split' },
        officer,
      );
      await h.grading.approveCorrection(id, {}, manager);

      expect(h.adjustments.rows).toHaveLength(1);
      expect(h.adjustments.rows[0]).toMatchObject({
        estateId: 1,
        deliveryId: ID,
        requestId: id,
        originSettlementId: 'SET-2026-08-001',
        superKgDelta: '20',
        normalKgDelta: '-20',
        superRate: '185.00',
        normalRate: '95.00',
        amountRs: '1800',
        status: 'pending',
        appliedSettlementId: null,
      });
      expect(h.settlements.rows[0]).toEqual(before); // the paid settlement was not rewritten
      expect(record().settlementId).toBe('SET-2026-08-001');
    });

    it('a downward correction produces a negative (signed) adjustment', async () => {
      const down = [
        { grade: 'Super' as const, weightKg: 80 },
        { grade: 'Normal' as const, weightKg: 50 },
      ];
      const { id } = await h.grading.requestCorrection(
        ID,
        { lines: down, reason: 'Over-recorded' },
        officer,
      );
      await h.grading.approveCorrection(id, {}, manager);
      expect(Number(h.adjustments.rows[0].amountRs)).toBe(-3700);
    });
  });
});
