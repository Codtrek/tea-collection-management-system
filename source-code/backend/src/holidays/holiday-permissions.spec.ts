import {
  type ChangeContext,
  decide,
  type HolidayAction,
  type HolidayLevels,
} from './holiday-permissions';

// the seeded role_permissions rows (Attendance-Leave-Addendum §4.1)
const ROLES: Record<'Administrator' | 'Manager' | 'Officer', HolidayLevels> = {
  Administrator: { calendar: 'approve', statutory: 'approve' },
  Manager: { calendar: 'edit', statutory: 'view' },
  Officer: { calendar: 'view', statutory: 'view' },
};

const ownFuture: ChangeContext = {
  own: true,
  future: true,
  payrollProcessed: false,
  appliesTo: 'factory',
};

// action → [Administrator, Manager, Officer]
const MATRIX: [HolidayAction, string, string, string][] = [
  ['view', 'direct', 'direct', 'direct'],
  ['statutory', 'direct', 'deny', 'deny'],
  ['types', 'direct', 'deny', 'deny'],
  ['weeklyRule', 'direct', 'request', 'deny'],
  ['categoryHoliday', 'direct', 'direct', 'deny'],
  ['restDay', 'direct', 'direct', 'deny'],
  ['factoryClosure', 'direct', 'request', 'deny'],
  ['emergencyClosure', 'direct', 'review', 'deny'],
  ['changeHoliday', 'direct', 'direct', 'deny'],
  ['approve', 'direct', 'deny', 'deny'],
];

describe('holiday permission matrix', () => {
  it.each(MATRIX)(
    '%s: Administrator %s · Manager %s · Officer %s',
    (action, a, m, o) => {
      expect(decide(action, ROLES.Administrator, ownFuture).kind).toBe(a);
      expect(decide(action, ROLES.Manager, ownFuture).kind).toBe(m);
      expect(decide(action, ROLES.Officer, ownFuture).kind).toBe(o);
    },
  );

  it('a Manager changes only their own, future holidays with no processed payroll', () => {
    // the deny message, or the outcome when it isn't denied
    const m = (ctx: Partial<ChangeContext>) => {
      const o = decide('changeHoliday', ROLES.Manager, {
        ...ownFuture,
        ...ctx,
      });
      return o.kind === 'deny' ? o.message : o.kind;
    };
    expect(m({ own: false })).toMatch(/you created/);
    expect(m({ future: false })).toMatch(/future/);
    expect(m({ payrollProcessed: true })).toMatch(/Payroll/);
    expect(m({ appliesTo: 'all' })).toMatch(/factory-wide/);
  });

  it('the Administrator may change any holiday', () => {
    expect(
      decide('changeHoliday', ROLES.Administrator, {
        own: false,
        future: false,
        payrollProcessed: true,
        appliesTo: 'all',
      }).kind,
    ).toBe('direct');
  });

  it('it is data-driven: giving a Manager holidayStatutory edit lets them enter Poya days', () => {
    expect(
      decide('statutory', { calendar: 'edit', statutory: 'edit' }).kind,
    ).toBe('direct');
    // …without giving them approvals
    expect(
      decide('approve', { calendar: 'edit', statutory: 'edit' }).kind,
    ).toBe('deny');
  });
});
