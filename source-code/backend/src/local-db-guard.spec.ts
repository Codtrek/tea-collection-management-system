import {
  assertLocalDatabaseUrl,
  assertLocalServer,
  isLoopback,
} from './local-db-guard';

describe('local-db-guard — seeds never touch the hosted database', () => {
  it('accepts a database on this machine', () => {
    for (const url of [
      'postgresql://tea@localhost:5433/tea_dev',
      'postgresql://tea@127.0.0.1:5433/tea_dev',
      'postgresql://tea@[::1]:5433/tea_dev',
      'postgresql://tea@localhost:5433/tea_dev?host=::1',
      'postgresql://tea@localhost/tea_dev?host=/var/run/postgresql',
    ]) {
      expect(() => assertLocalDatabaseUrl(url)).not.toThrow();
    }
  });

  it('refuses a remote host, whether in the URL or in a host / hostaddr parameter', () => {
    expect(() =>
      assertLocalDatabaseUrl(
        'postgresql://u:p@harboost-db.duckdns.org:5432/tea',
      ),
    ).toThrow(/"harboost-db.duckdns.org" is not this machine/);
    expect(() =>
      assertLocalDatabaseUrl(
        'postgresql://u:p@ep-x.neon.tech/neondb?sslmode=require',
      ),
    ).toThrow(/not this machine/);
    // pg connects to the parameter, not the URL's host
    expect(() =>
      assertLocalDatabaseUrl(
        'postgresql://u@localhost:5432/tea?host=172.16.0.4',
      ),
    ).toThrow(/"172.16.0.4" is not this machine/);
    expect(() =>
      assertLocalDatabaseUrl(
        'postgresql://u@localhost:5432/tea?hostaddr=10.0.0.5',
      ),
    ).toThrow(/"10.0.0.5"/);
  });

  it('refuses a missing or broken URL', () => {
    expect(() => assertLocalDatabaseUrl(undefined)).toThrow(/not set/);
    expect(() => assertLocalDatabaseUrl('not a url')).toThrow(
      /not a valid URL/,
    );
  });

  it('loopback and Unix-socket servers are local; any other address is not', () => {
    expect(isLoopback(null)).toBe(true);
    expect(isLoopback('127.0.0.1')).toBe(true);
    expect(isLoopback('::1')).toBe(true);
    expect(isLoopback('172.16.0.4')).toBe(false);
    expect(isLoopback('10.1.2.3')).toBe(false);
  });

  it('after connecting, refuses a server that is elsewhere — the ssh-tunnel case', async () => {
    const server = (addr: string | null) => ({
      query: jest.fn().mockResolvedValue({ rows: [{ addr }] }),
    });
    // 127.0.0.1:5433 here is forwarded to the hosted DB, which reports its own address
    await expect(assertLocalServer(server('172.16.0.4'))).rejects.toThrow(
      /server is at 172.16.0.4, not on this machine/,
    );
    await expect(assertLocalServer(server('::1'))).resolves.toBeUndefined();
    await expect(assertLocalServer(server(null))).resolves.toBeUndefined();
  });
});
