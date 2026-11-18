/**
 * The seeds write and delete rows, so they only ever run on a database on THIS machine — never
 * the hosted (Azure VM) database. Tested in local-db-guard.spec.ts.
 *
 * Two checks, because the URL alone can lie:
 *  1. Before connecting: the URL's host — and any `host` / `hostaddr` query parameter, which
 *     `pg` prefers over the URL's host — must be this machine (localhost / 127.0.0.1 / ::1 or a
 *     Unix-socket path).
 *  2. After connecting, before any statement: the SERVER says where it is. An ssh tunnel makes a
 *     remote database answer on 127.0.0.1 here (this machine has one: 127.0.0.1:5433 → the
 *     hosted DB), so a local-looking URL can still land on it. `inet_server_addr()` is the
 *     address the server accepted the connection on: NULL over a Unix socket, loopback for a
 *     local TCP connection, and the remote machine's own address through such a tunnel.
 *
 * Limit: a tunnel that ends on the remote server's own loopback would also report loopback;
 * no URL or address check can tell that apart.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const isLocalHost = (h: string) =>
  LOCAL_HOSTS.has(h.replace(/^\[|\]$/g, '').toLowerCase()) || h.startsWith('/');

export function assertLocalDatabaseUrl(url: string | undefined): void {
  if (!url) throw new Error('DATABASE_URL is not set.');
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL.');
  }
  const hosts = [
    parsed.hostname,
    ...parsed.searchParams.getAll('host'),
    ...parsed.searchParams.getAll('hostaddr'),
  ].filter((h) => h !== '');
  const remote = hosts.find((h) => !isLocalHost(h));
  if (remote !== undefined) {
    throw new Error(
      `Refusing to run: the database host "${remote}" is not this machine. Seeds only run on a local dev database.`,
    );
  }
}

/** True for an address on this machine's loopback (or NULL = a Unix socket). */
export function isLoopback(addr: string | null): boolean {
  if (addr === null) return true;
  const a = addr.replace(/\/\d+$/, '');
  return a === '::1' || a.startsWith('127.') || a === '::ffff:127.0.0.1';
}

interface Queryable {
  query<R extends Record<string, unknown>>(sql: string): Promise<{ rows: R[] }>;
}

/** Run straight after connecting, before anything else. */
export async function assertLocalServer(client: Queryable): Promise<void> {
  const { rows } = await client.query<{ addr: string | null }>(
    'SELECT host(inet_server_addr()) AS addr',
  );
  const addr = rows[0]?.addr ?? null;
  if (!isLoopback(addr)) {
    throw new Error(
      `Refusing to run: the database server is at ${addr}, not on this machine (is an ssh tunnel forwarding this port?). Seeds only run on a local dev database.`,
    );
  }
}
