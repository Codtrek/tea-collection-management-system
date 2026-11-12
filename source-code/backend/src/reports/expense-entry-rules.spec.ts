import {
  changeSummary,
  createError,
  editAccess,
  editError,
  type EditContext,
} from './expense-entry-rules';

/** RPT-04 — who may log and change a daily expense (Finance-Reports-Addendum §7). */

const TODAY = '2026-11-15';
const ctx = (o: Partial<EditContext> = {}): EditContext => ({
  level: 'edit',
  isCreator: true,
  loggedOn: '2026-11-10',
  today: TODAY,
  windowDays: 7,
  ...o,
});

describe('logging an expense', () => {
  it('no future dates; today and the past are fine', () => {
    expect(createError('edit', '2026-11-16', TODAY)).toMatch(/future/);
    expect(createError('edit', TODAY, TODAY)).toBeNull();
    expect(createError('edit', '2026-01-03', TODAY)).toBeNull();
  });

  it('needs expenses: edit — the Administrator (view) only reads', () => {
    expect(createError('view', TODAY, TODAY)).toMatch(/may not/);
    expect(createError('none', TODAY, TODAY)).toMatch(/may not/);
    expect(createError('approve', TODAY, TODAY)).toBeNull();
  });
});

describe('changing an expense', () => {
  it('the creator may change it within the window, with no reason', () => {
    expect(editAccess(ctx())).toEqual({
      allowed: true,
      needsReason: false,
      note: null,
    });
    // the 7th day is still inside
    expect(editAccess(ctx({ loggedOn: '2026-11-08' })).allowed).toBe(true);
  });

  it('after the window the creator can’t — only the Manager, with a reason', () => {
    const late = ctx({ loggedOn: '2026-11-07' });
    expect(editAccess(late)).toMatchObject({ allowed: false });
    expect(editError(late, undefined, 'typo')).toMatch(
      /only the Factory Manager/,
    );
    const manager = { ...late, level: 'approve' as const };
    expect(editAccess(manager)).toMatchObject({
      allowed: true,
      needsReason: true,
    });
    expect(editError(manager, undefined, '  ')).toMatch(/reason/);
    expect(editError(manager, undefined, 'Invoice corrected')).toBeNull();
  });

  it('someone else’s entry: an Officer can’t; the Manager can, with a reason', () => {
    expect(editAccess(ctx({ isCreator: false })).allowed).toBe(false);
    expect(
      editAccess(ctx({ isCreator: false, level: 'approve' })),
    ).toMatchObject({ allowed: true, needsReason: true });
  });

  it('the Administrator only views', () => {
    const a = editAccess(ctx({ level: 'view' }));
    expect(a.allowed).toBe(false);
    expect(a.note).toMatch(/view/);
  });

  it('a change can’t move the date into the future', () => {
    expect(editError(ctx(), '2026-11-20', null)).toMatch(/future/);
  });

  it('the audit diff lists only what changed', () => {
    expect(
      changeSummary(
        { amount: 'Rs. 5,000', category: 'Water', date: '2026-11-10' },
        { amount: 'Rs. 5,200', category: 'Water', date: '2026-11-10' },
        { amount: 'Amount', category: 'Category', date: 'Date' },
      ),
    ).toBe('Amount: Rs. 5,000 → Rs. 5,200');
  });
});
