import {
  type CalendarFacts,
  dayInfo,
  datesOfMonth,
  DEFAULT_TYPES,
  weekdayOf,
  workingDaysIn,
} from './working-days';

const facts = (more: Partial<CalendarFacts> = {}): CalendarFacts => ({
  holidays: [],
  weekly: [
    {
      category: 'factory',
      weekdays: [0],
      halfDayWeekday: null,
      effectiveFrom: '2000-01-01',
    },
    {
      category: 'office',
      weekdays: [0, 6],
      halfDayWeekday: null,
      effectiveFrom: '2000-01-01',
    },
  ],
  restDays: [],
  types: DEFAULT_TYPES,
  ...more,
});
const worker = { id: 1, category: 'factory' as const };
const clerk = { id: 2, category: 'office' as const };

describe('working days', () => {
  it('knows the weekday (1 Nov 2026 is a Sunday)', () => {
    expect(weekdayOf('2026-11-01')).toBe(0);
    expect(datesOfMonth('2026-02')).toHaveLength(28);
  });

  it('weekly holiday per category: Saturday is a working day for factory, a holiday for office', () => {
    expect(dayInfo('2026-11-07', worker, facts()).type).toBe('working');
    expect(dayInfo('2026-11-07', clerk, facts()).type).toBe('weekly');
    expect(dayInfo('2026-11-08', worker, facts()).type).toBe('weekly');
  });

  it('a per-employee rest day overrides the category (Sunday becomes a working day)', () => {
    const f = facts({
      restDays: [{ employeeId: 1, weekday: 3, effectiveFrom: '2026-11-01' }],
    });
    expect(dayInfo('2026-11-08', worker, f).type).toBe('working');
    expect(dayInfo('2026-11-11', worker, f)).toMatchObject({
      type: 'rest',
      working: false,
    });
    // before it took effect, the category rule still applies
    expect(dayInfo('2026-10-25', worker, f).type).toBe('weekly');
  });

  it('an effective-from change never touches past weeks', () => {
    const f = facts({
      weekly: [
        {
          category: 'factory',
          weekdays: [0],
          halfDayWeekday: null,
          effectiveFrom: '2000-01-01',
        },
        {
          category: 'factory',
          weekdays: [0],
          halfDayWeekday: 6,
          effectiveFrom: '2026-12-01',
        },
      ],
    });
    expect(dayInfo('2026-11-28', worker, f).type).toBe('working');
    expect(dayInfo('2026-12-05', worker, f)).toMatchObject({
      type: 'half',
      weight: 0.5,
    });
  });

  it('Poya and a closure for one category only', () => {
    const f = facts({
      holidays: [
        {
          date: '2026-11-24',
          name: 'Il Full Moon Poya',
          type: 'poya',
          paid: true,
          workAllowed: true,
          appliesTo: 'all',
        },
        {
          date: '2026-11-26',
          name: 'Office closed',
          type: 'closure',
          paid: false,
          workAllowed: false,
          appliesTo: 'office',
        },
      ],
    });
    expect(dayInfo('2026-11-24', worker, f)).toMatchObject({
      type: 'poya',
      label: 'Il Full Moon Poya',
      paid: true,
    });
    expect(dayInfo('2026-11-26', clerk, f)).toMatchObject({
      type: 'closure',
      workAllowed: false,
    });
    expect(dayInfo('2026-11-26', worker, f).type).toBe('working');
  });

  it('the working-day count skips weekly holidays, Poya and public holidays', () => {
    const f = facts({
      holidays: [
        {
          date: '2026-11-24',
          name: 'Poya',
          type: 'poya',
          paid: true,
          workAllowed: true,
          appliesTo: 'all',
        },
      ],
    });
    // 23–29 Nov: Mon–Sat = 6 working days, minus the Poya Tuesday = 5 (Sunday the 29th is weekly)
    expect(workingDaysIn('2026-11-23', '2026-11-29', worker, f)).toBe(5);
    expect(workingDaysIn('2026-11-23', '2026-11-29', clerk, f)).toBe(4);
  });
});
