/**
 * In-memory stand-in for the slice of TypeORM's Repository the grading code uses:
 * equality `where`, create/save (auto numeric ids), `update(criteria, patch)` returning
 * `affected` (the compare-and-swap the outbox claim relies on), and a `manager` whose
 * `transaction(fn)` hands the callback an EntityManager-like with `getRepository`.
 */
export class FakeRepo<T extends object> {
  readonly rows: T[] = [];
  private seq = 1;
  manager!: FakeManager;

  constructor(private readonly idKey: keyof T | null = 'id' as keyof T) {}

  seed(...items: T[]): this {
    for (const item of items) void this.save(item);
    return this;
  }

  private matches(row: T, where?: Partial<T>): boolean {
    if (!where) return true;
    return (Object.entries(where) as [keyof T, unknown][]).every(
      ([k, v]) => row[k] === v,
    );
  }

  find(opts?: { where?: Partial<T> }): Promise<T[]> {
    return Promise.resolve(
      this.rows.filter((r) => this.matches(r, opts?.where)),
    );
  }

  findOne(opts: { where: Partial<T> }): Promise<T | null> {
    return Promise.resolve(
      this.rows.find((r) => this.matches(r, opts.where)) ?? null,
    );
  }

  create(partial: Partial<T>): T {
    return { ...partial } as T;
  }

  save<E extends T | T[]>(entity: E): Promise<E> {
    const items = (Array.isArray(entity) ? entity : [entity]) as T[];
    for (const item of items) {
      const rec = item as Record<keyof T, unknown>;
      if (this.idKey && rec[this.idKey] === undefined)
        rec[this.idKey] = this.seq++;
      if (!this.rows.includes(item)) this.rows.push(item);
    }
    return Promise.resolve(entity);
  }

  update(
    criteria: Partial<T>,
    patch: Partial<T>,
  ): Promise<{ affected: number }> {
    const hits = this.rows.filter((r) => this.matches(r, criteria));
    for (const r of hits) Object.assign(r, patch);
    return Promise.resolve({ affected: hits.length });
  }
}

export class FakeManager {
  private readonly repos = new Map<unknown, FakeRepo<object>>();

  register(entity: unknown, repo: FakeRepo<object>): void {
    this.repos.set(entity, repo);
    repo.manager = this;
  }

  getRepository(entity: unknown): FakeRepo<object> {
    const repo = this.repos.get(entity);
    if (!repo)
      throw new Error(`No fake repository registered for ${String(entity)}`);
    return repo;
  }

  transaction<T>(fn: (m: FakeManager) => Promise<T>): Promise<T> {
    return fn(this);
  }
}
