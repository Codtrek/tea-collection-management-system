import type { DayInfo } from '../holidays/working-days';
import {
  codeOf,
  daysBack,
  editWindowError,
  monthTotals,
  resolveAttendance,
} from './attendance-rules';

const working = (date: string): DayInfo => ({
  date,
  type: 'working',
  label: null,
  working: true,
  weight: 1,
  paid: true,
  workAllowed: true,
});
const poya = (date: string, workAllowed = true): DayInfo => ({
  date,
  type: 'poya',
  label: 'Il Full Moon Poya',
  working: false,
  weight: 0,
  paid: true,
  workAllowed,
});

describe('attendance rules', () => {
  const today = '2026-11-10';

  it('rejects a future date for everyone, Manager included', () => {
    expect(editWindowError('2026-11-11', today, 3, 'approve', 'x')).toBe(
      'Attendance can’t be marked for a future date.',
    );
  });

  it('an Officer marks today and up to N days back; older needs the Manager + a reason', () => {
    expect(daysBack('2026-11-07', today)).toBe(3);
    expect(editWindowError('2026-11-07', today, 3, 'edit', null)).toBeNull();
    expect(editWindowError('2026-11-06', today, 3, 'edit', 'x')).toMatch(
      /Only the Factory Manager/,
    );
    expect(editWindowError('2026-11-06', today, 3, 'approve', '')).toMatch(
      /a reason is required/,
    );
    expect(
      editWindowError('2026-11-06', today, 3, 'approve', 'Late register'),
    ).toBeNull();
    expect(editWindowError(today, today, 3, 'view', null)).toBe(
      'Your role may not mark attendance.',
    );
  });

  it('a non-working day can’t be Absent or Leave; working it is "Worked on holiday"', () => {
    expect(resolveAttendance({ status: 'Absent' }, poya('2026-11-24'))).toEqual(
      {
        error: '2026-11-24 is Il Full Moon Poya — it can’t be marked Absent.',
      },
    );
    const worked = resolveAttendance({ status: 'Present' }, poya('2026-11-24'));
    expect(worked).toMatchObject({ ok: { holidayWorked: true, dayHours: 8 } });
    expect(codeOf({ status: 'Present', holidayWorked: true })).toBe('W');
    expect(
      resolveAttendance({ status: 'Present' }, poya('2026-11-24', false)),
    ).toEqual({
      error: '2026-11-24 is Il Full Moon Poya — no work is allowed that day.',
    });
  });

  it('half-day needs AM/PM; short leave needs a valid out and back', () => {
    expect(resolveAttendance({ status: 'Half-day' }, working(today))).toEqual({
      error: 'Choose AM or PM for a half day.',
    });
    expect(
      resolveAttendance({ status: 'Half-day', half: 'PM' }, working(today)),
    ).toMatchObject({ ok: { half: 'PM', dayHours: 4 } });
    expect(
      resolveAttendance(
        { status: 'Short leave', shortOut: '10:00' },
        working(today),
      ),
    ).toHaveProperty('error');
    expect(
      resolveAttendance(
        { status: 'Short leave', shortOut: '11:00', shortBack: '10:00' },
        working(today),
      ),
    ).toEqual({
      error: 'The time back must be after the time out.',
    });
    expect(
      resolveAttendance(
        { status: 'Short leave', shortOut: '10:00', shortBack: '11:15' },
        working(today),
      ),
    ).toMatchObject({
      ok: { shortOut: '10:00', shortBack: '11:15', dayHours: 8 },
    });
  });

  it('month totals: present ÷ working days, holidays and future days left out', () => {
    const cells = [
      { code: 'P' as const, day: working('2026-11-02'), future: false },
      { code: 'H' as const, day: working('2026-11-03'), future: false },
      { code: 'A' as const, day: working('2026-11-04'), future: false },
      { code: null, day: working('2026-11-05'), future: false },
      { code: 'W' as const, day: poya('2026-11-08'), future: false },
      { code: null, day: working('2026-11-30'), future: true },
    ];
    expect(monthTotals(cells)).toMatchObject({
      present: 1,
      half: 1,
      absent: 1,
      holidayWorked: 1,
      workingDays: 4,
      unmarked: 1,
      pct: 37.5,
    });
  });
});
