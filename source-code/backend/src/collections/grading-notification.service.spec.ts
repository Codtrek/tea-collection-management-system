import { ConflictException } from '@nestjs/common';
import { STALE_SENDING_MS } from './grading-notification.service';
import {
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

describe('owner notification outbox', () => {
  let h: ReturnType<typeof buildGradingHarness>;
  const sentRows = () => h.notifications.rows;

  beforeEach(async () => {
    freezeClock(T0);
    h = buildGradingHarness();
    h.records.seed(makeRecord());
    await h.grading.setGradeLines(ID, { lines: LINES }, officer);
  });
  afterEach(() => jest.useRealTimers());

  it('is HELD during the correction window and sent once when it ends', async () => {
    setClock(minutes(T0, 29));
    expect(await h.outboxService.sweep()).toBe(0);
    expect(sentRows()).toHaveLength(0);
    expect(await h.outboxService.statusFor(ID)).toBe('Queued');

    setClock(minutes(T0, 30));
    expect(await h.outboxService.sweep()).toBe(1);
    expect(sentRows()).toHaveLength(1);
    expect(sentRows()[0]).toMatchObject({
      userId: 77,
      type: 'delivery_graded',
      dedupeKey: `graded:${ID}`,
    });
    expect(h.outbox.rows[0]).toMatchObject({ status: 'sent', attempts: 1 });
    expect(await h.outboxService.statusFor(ID)).toBe('Sent');
  });

  it('says what the factory received, per grade, with the reference and estate weight — neutral wording', async () => {
    setClock(minutes(T0, 31));
    await h.outboxService.sweep();
    const { title, body } = sentRows()[0];
    expect(title).toContain('Green Valley Estate');
    expect(body).toBe(
      'The factory received 150 kg from Green Valley Estate on 2026-08-10: 100 kg Super, 50 kg Normal. ' +
        'Delivery GV-2026-0001; estate weight 150 kg.',
    );
  });

  it('mentions both figures neutrally when the totals differ beyond the tolerance', async () => {
    h.records.seed(makeRecord({ id: 'D' }));
    await h.grading.setGradeLines(
      'D',
      { lines: [{ grade: 'Super', weightKg: 120 }] },
      officer,
    );
    setClock(minutes(T0, 31));
    await h.outboxService.sweep();
    const body = sentRows().find((n) => n.dedupeKey === 'graded:D')!.body!;
    expect(body).toContain(
      'The estate recorded 150 kg and the factory recorded 120 kg; both figures are on file.',
    );
    expect(body).not.toMatch(/mismatch|error|wrong|discrepan|fault/i);
  });

  it('uses the LATEST values when the record was edited during the window', async () => {
    setClock(minutes(T0, 10));
    await h.grading.setGradeLines(
      ID,
      {
        lines: [
          { grade: 'Super', weightKg: 140 },
          { grade: 'Normal', weightKg: 10 },
        ],
        reason: 'Typed the split wrong',
      },
      officer,
    );
    expect(h.outbox.rows).toHaveLength(1); // still ONE held notification
    setClock(minutes(T0, 31));
    await h.outboxService.sweep();
    expect(sentRows()).toHaveLength(1);
    expect(sentRows()[0].body).toContain('140 kg Super, 10 kg Normal');
    expect(sentRows()[0].body).not.toContain('100 kg Super');
  });

  it('Finalize releases it immediately', async () => {
    setClock(minutes(T0, 3));
    await h.grading.finalize(ID, officer);
    expect(await h.outboxService.sweep()).toBe(1);
    expect(sentRows()).toHaveLength(1);
  });

  describe('idempotent — no duplicates', () => {
    it('re-running the sweep never sends twice', async () => {
      setClock(minutes(T0, 31));
      await h.outboxService.sweep();
      await h.outboxService.sweep();
      await h.outboxService.sweep();
      expect(sentRows()).toHaveLength(1);
    });

    it('two instances sweeping at the same moment: exactly one claims and sends', async () => {
      const other = h.notifyService();
      setClock(minutes(T0, 31));
      await Promise.all([h.outboxService.sweep(), other.sweep()]);
      expect(sentRows()).toHaveLength(1);
      expect(h.outbox.rows[0].attempts).toBe(1);
    });

    it('a crash AFTER storing the notice but BEFORE marking it sent does not duplicate it on retry', async () => {
      setClock(minutes(T0, 31));
      await h.outboxService.sweep();
      // simulate the crash: the notice exists, the outbox row never got its 'sent' mark
      Object.assign(h.outbox.rows[0], { status: 'queued', sentAt: null });
      await h.outboxService.sweep();
      expect(sentRows()).toHaveLength(1);
      expect(h.outbox.rows[0].status).toBe('sent');
    });

    it('enqueueing is idempotent per delivery', async () => {
      await h.grading.cancelOwnerNotification('nobody'); // harmless
      expect(h.outbox.rows).toHaveLength(1);
    });
  });

  describe('survives a restart', () => {
    it('a brand-new service instance over the same stored outbox sends what was queued', async () => {
      const restarted = h.notifyService(); // fresh process: no in-memory state at all
      setClock(minutes(T0, 31));
      expect(await restarted.sweep()).toBe(1);
      expect(sentRows()).toHaveLength(1);
    });

    it('a claim left behind by a process that died is released after a few minutes and sent', async () => {
      setClock(minutes(T0, 31));
      Object.assign(h.outbox.rows[0], {
        status: 'sending',
        attempts: 1,
        updatedAt: new Date(),
      });
      expect(await h.outboxService.sweep()).toBe(0); // fresh claim: leave it alone
      setClock(new Date(Date.now() + STALE_SENDING_MS + 1000));
      expect(await h.outboxService.sweep()).toBe(1);
      expect(sentRows()).toHaveLength(1);
    });
  });

  describe('correction after it was sent', () => {
    const NEW = [
      { grade: 'Super' as const, weightKg: 120 },
      { grade: 'Normal' as const, weightKg: 30 },
    ];

    async function sendOriginalThenApproveCorrection() {
      setClock(minutes(T0, 31));
      await h.outboxService.sweep();
      const { id } = await h.grading.requestCorrection(
        ID,
        { lines: NEW, reason: 'Wrong split' },
        officer,
      );
      await h.grading.approveCorrection(id, {}, manager);
      return id;
    }

    it('sends a NEW "Correction" notice with old and new values; the original is never edited or deleted', async () => {
      const requestId = await sendOriginalThenApproveCorrection();
      const originalNotice = { ...sentRows()[0] };

      expect(h.outbox.rows.map((r) => r.kind)).toEqual([
        'graded',
        'correction',
      ]);
      expect(h.outbox.rows[1]).toMatchObject({
        status: 'queued',
        dedupeKey: `correction:${requestId}`,
      });
      expect(await h.outboxService.sweep()).toBe(1);

      expect(sentRows()).toHaveLength(2);
      const correction = sentRows()[1];
      expect(correction.type).toBe('grade_correction');
      expect(correction.title).toContain('Correction');
      expect(correction.body).toContain(
        'Before: 150 kg — 100 kg Super, 50 kg Normal',
      );
      expect(correction.body).toContain(
        'Now: 150 kg — 120 kg Super, 30 kg Normal',
      );
      expect(sentRows()[0]).toEqual(originalNotice); // untouched
      expect(h.outbox.rows[0].status).toBe('sent');
      expect(await h.outboxService.statusFor(ID)).toBe('Correction sent');
    });

    it('does not send the correction twice', async () => {
      await sendOriginalThenApproveCorrection();
      await h.outboxService.sweep();
      await h.outboxService.sweep();
      expect(sentRows()).toHaveLength(2);
    });

    it('if the original has NOT gone out yet there is nothing to correct — it just carries the latest values', async () => {
      // lock early via Finalize but do not sweep yet
      setClock(minutes(T0, 2));
      await h.grading.finalize(ID, officer);
      const { id } = await h.grading.requestCorrection(
        ID,
        { lines: NEW, reason: 'Wrong split' },
        officer,
      );
      await h.grading.approveCorrection(id, {}, manager);
      expect(h.outbox.rows).toHaveLength(1);
      await h.outboxService.sweep();
      expect(sentRows()).toHaveLength(1);
      expect(sentRows()[0].body).toContain('120 kg Super, 30 kg Normal');
    });

    it('a settled correction sends the same labelled notice (the money moves through the adjustment, not the message)', async () => {
      setClock(minutes(T0, 31));
      await h.outboxService.sweep();
      h.records.rows[0].settlementId = 'SET-2026-08-001';
      h.settlements.seed(makeSettlement());
      const { id } = await h.grading.requestCorrection(
        ID,
        { lines: NEW, reason: 'Wrong split' },
        officer,
      );
      await h.grading.approveCorrection(id, {}, manager);
      await h.outboxService.sweep();
      expect(sentRows().map((n) => n.type)).toEqual([
        'delivery_graded',
        'grade_correction',
      ]);
    });
  });

  describe('failures, resend, cancel', () => {
    it('marks Failed with the reason when the estate owner has no account, and an officer can resend', async () => {
      h.owners.rows.length = 0;
      setClock(minutes(T0, 31));
      expect(await h.outboxService.sweep()).toBe(0);
      expect(h.outbox.rows[0]).toMatchObject({
        status: 'failed',
        lastError: 'This estate has no owner account to notify.',
      });
      expect(await h.outboxService.statusFor(ID)).toBe('Failed');
      expect(sentRows()).toHaveLength(0);

      // fix the cause, then resend
      h.owners.seed({ id: 10, userId: 77, name: 'K. Perera' } as never);
      await h.outboxService.resend(ID, officer);
      expect(h.outbox.rows[0].status).toBe('queued');
      expect(await h.outboxService.sweep()).toBe(1);
      expect(sentRows()).toHaveLength(1);
      expect(await h.outboxService.statusFor(ID)).toBe('Sent');
    });

    it('resend is refused when nothing has failed', async () => {
      await expect(h.outboxService.resend(ID, officer)).rejects.toThrow(
        ConflictException,
      );
    });

    it('a cancelled delivery never sends', async () => {
      await h.grading.cancelOwnerNotification(ID);
      setClock(minutes(T0, 31));
      expect(await h.outboxService.sweep()).toBe(0);
      expect(h.outbox.rows[0].status).toBe('cancelled');
      expect(sentRows()).toHaveLength(0);
    });

    it('never releases a graded notice while the delivery is still OPEN, even if send_after has passed', async () => {
      h.outbox.rows[0].sendAfter = minutes(T0, 1); // clock skew / manual poke
      setClock(minutes(T0, 5));
      expect(await h.outboxService.sweep()).toBe(0);
      expect(sentRows()).toHaveLength(0);
      expect(h.outbox.rows[0]).toMatchObject({
        status: 'queued',
        sendAfter: minutes(T0, 30),
      });
    });
  });
});
