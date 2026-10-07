import { buildHarness } from './testing/harness';

describe('AgentDirectoryService — agents are driven by EMPLOYEES', () => {
  it('lists Active employees with the agent role who are linked to dispatch', async () => {
    const h = buildHarness();
    const all = await h.directory.all();
    expect(all.map((a) => a.agentId)).toEqual([1, 2, 3, 4, 5]);
    expect(all[0]).toMatchObject({
      employeeId: 'EMP-0001',
      name: 'R. Senanayake',
      userId: 11,
    });
  });

  it('a newly registered agent appears, with no route yet', async () => {
    const h = buildHarness();
    h.registerAgent(6, 'P. Fernando');
    const all = await h.directory.all();
    expect(all.map((a) => a.name)).toContain('P. Fernando');
  });

  it.each(['Inactive', 'Suspended'] as const)(
    'excludes a %s employee',
    async (status) => {
      const h = buildHarness();
      h.setEmployee(2, { status });
      expect((await h.directory.all()).map((a) => a.agentId)).not.toContain(2);
      expect(await h.directory.byId(2)).toBeNull();
    },
  );

  it('excludes an employee whose job title is no longer the agent role', async () => {
    const h = buildHarness();
    h.setEmployee(3, { role: 'Driver' });
    expect((await h.directory.all()).map((a) => a.agentId)).not.toContain(3);
  });

  it('excludes an agent row with no employee link or no login', async () => {
    const h = buildHarness();
    h.agentRows.rows.find((r) => r.id === 4)!.hrEmployeeId = null;
    h.setEmployee(5, { userId: null });
    expect((await h.directory.all()).map((a) => a.agentId)).toEqual([1, 2, 3]);
  });

  it('a deactivated agent can no longer be resolved from their mobile login', async () => {
    const h = buildHarness();
    expect((await h.directory.byUserId(h.uid(2)))?.agentId).toBe(2);
    h.setEmployee(2, { status: 'Inactive' });
    expect(await h.directory.byUserId(h.uid(2))).toBeNull();
  });

  it('reports login state for the agent API', async () => {
    const h = buildHarness();
    h.setLogin(1, { must_change_password: true });
    expect(await h.directory.credentials(h.uid(1))).toEqual({
      status: 'active',
      mustChangePassword: true,
    });
    expect(await h.directory.credentials(999)).toBeNull();
  });
});
