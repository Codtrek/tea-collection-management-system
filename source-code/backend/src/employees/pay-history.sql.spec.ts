import { DataSource } from 'typeorm';
import { EmployeeAttendanceEntity } from './employee-attendance.entity';
import { EmployeeEntity } from './employee.entity';
import { PayRateEntity } from './pay-rate.entity';
import { grossByDay, toPayVersion } from './pay-resolution';

/*
  Pay history against a real database (Administration-Addendum §6): pricing every attendance day
  from pay_rates gives the same gross, per employee and month, as the rates on the employee
  record — so moving payroll onto pay history changed nothing. Opt-in, read-only:

    REPORT_SQL_CHECK_URL=postgresql://tea@localhost:5433/tea_dev npx jest pay-history.sql
*/
const URL = process.env.REPORT_SQL_CHECK_URL;

const SQL = `
  SELECT a.employee_id, to_char(a.date, 'YYYY-MM') AS month,
         round(sum(a.day_hours * e.day_rate + a.day_ot_hours * e.day_ot_rate
                 + a.night_hours * e.night_rate + a.night_ot_hours * e.night_ot_rate), 2) AS gross
    FROM employee_attendance a JOIN employees e ON e.id = a.employee_id
   GROUP BY 1, 2 ORDER BY 1, 2`;

(URL ? describe : describe.skip)('pay history vs the rates on record', () => {
  let ds: DataSource;
  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      url: URL,
      entities: [EmployeeEntity, EmployeeAttendanceEntity, PayRateEntity],
    });
    await ds.initialize();
  });
  afterAll(() => ds?.destroy());

  it('every employee-month prices the same', async () => {
    const [rows, employees, attendance, rates] = await Promise.all([
      ds.query<{ employee_id: number; month: string; gross: string }[]>(SQL),
      ds.getRepository(EmployeeEntity).find(),
      ds.getRepository(EmployeeAttendanceEntity).find(),
      ds.getRepository(PayRateEntity).find(),
    ]);
    const versions = rates.map(toPayVersion);
    const byId = new Map(employees.map((e) => [e.id, e]));
    let checked = 0;
    for (const r of rows) {
      const days = attendance
        .filter(
          (a) => a.employeeId === r.employee_id && a.date.startsWith(r.month),
        )
        .map((a) => ({
          date: a.date,
          dayHours: Number(a.dayHours),
          dayOtHours: Number(a.dayOtHours),
          nightHours: Number(a.nightHours),
          nightOtHours: Number(a.nightOtHours),
        }));
      const got = grossByDay(days, versions, byId.get(r.employee_id)!);
      expect({ ...r, gross: got.gross }).toEqual({
        ...r,
        gross: Number(r.gross),
      });
      expect(got.unpricedDays).toBe(0);
      checked += 1;
    }
    console.log(`${checked} employee-months: pay history = rates on record`);
    expect(checked).toBeGreaterThan(0);
  });
});
