import { buildHarness, NOW, officer, TODAY } from './testing/harness';

// Attendance ↔ Agent Dispatch — one record, two views (Attendance-Leave-Addendum Phase 1).
// In the harness, agent N is HR employee N (collection_agents.hr_employee_id).
function scenario() {
  const h = buildHarness();
  h.permanent(1, 1);
  h.permanent(2, 2);
  h.permanent(3, 3);
  h.permanent(4, 4);
  h.neighbour(1, 2);
  return h;
}

describe('attendance ↔ dispatch', () => {
  it('an agent marked Absent in attendance shows ABSENT on the board and is no cover candidate', async () => {
    const h = scenario();
    await h.dispatch.syncFromAttendance(2, TODAY, 'Absent', 'S. Fernando', NOW);
    const day = (await h.dayStatus.find()).find(
      (d) => d.agentId === 2 && d.day === TODAY,
    );
    expect(day).toMatchObject({
      status: 'ABSENT',
      reason: 'Attendance: Absent',
    });
    await h.dispatch.markAbsent(1, 'Fever', officer, NOW);
    const ranked = await h.dispatch.candidates(1, NOW);
    expect(ranked.map((c) => c.agentId)).not.toContain(2);
  });

  it('approved leave shows as "On leave"; marking him Present again lifts it', async () => {
    const h = scenario();
    await h.dispatch.syncFromAttendance(3, TODAY, 'Leave', 'S. Fernando', NOW);
    expect(
      (await h.dayStatus.find()).find((d) => d.agentId === 3)?.reason,
    ).toBe('Attendance: On leave');
    await h.dispatch.syncFromAttendance(
      3,
      TODAY,
      'Present',
      'S. Fernando',
      NOW,
    );
    expect(
      (await h.dayStatus.find()).find((d) => d.agentId === 3)?.status,
    ).toBe('AVAILABLE');
  });

  it('marking an agent absent on the board writes his attendance; available again removes it', async () => {
    const h = scenario();
    await h.dispatch.markAbsent(4, 'Bike broke down', officer, NOW);
    const [row] = await h.attendanceRows.find();
    expect(row).toMatchObject({
      employeeId: 4,
      date: TODAY,
      status: 'Absent',
      source: 'dispatch',
      editReason: 'Bike broke down',
    });
    await h.dispatch.markAvailable(4, officer, NOW);
    expect(await h.attendanceRows.find()).toHaveLength(0);
  });

  it('the board never overwrites approved leave in attendance', async () => {
    const h = scenario();
    await h.attendanceRows.save({
      id: 1,
      employeeId: 4,
      date: TODAY,
      status: 'Leave',
    } as never);
    await h.dispatch.markAbsent(4, undefined, officer, NOW);
    expect((await h.attendanceRows.find())[0].status).toBe('Leave');
  });
});
