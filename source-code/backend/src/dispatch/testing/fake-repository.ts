/**
 * In-memory stand-in for the slice of TypeORM's Repository the dispatch services use:
 * equality `where`, simple `order`, create/save/delete. Auto-assigns numeric ids.
 * (Same lightweight approach as the other modules' specs — no database in unit tests.)
 */
export class FakeRepository<T extends object> {
  readonly rows: T[] = [];
  private seq = 1;

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

  findOne(opts: {
    where: Partial<T>;
    order?: Partial<Record<keyof T, 'ASC' | 'DESC'>>;
  }): Promise<T | null> {
    let hits = this.rows.filter((r) => this.matches(r, opts.where));
    if (opts.order) {
      const [[key, dir]] = Object.entries(opts.order) as [keyof T, string][];
      hits = [...hits].sort((a, b) => {
        const av = a[key] as unknown as number | Date | string;
        const bv = b[key] as unknown as number | Date | string;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return dir === 'DESC' ? -cmp : cmp;
      });
    }
    return Promise.resolve(hits[0] ?? null);
  }

  create(partial: Partial<T>): T {
    return { ...partial } as T;
  }

  save<E extends T | T[]>(entity: E): Promise<E> {
    const items = (Array.isArray(entity) ? entity : [entity]) as T[];
    for (const item of items) {
      if (
        this.idKey &&
        (item as Record<keyof T, unknown>)[this.idKey] === undefined
      ) {
        (item as Record<keyof T, unknown>)[this.idKey] = this.seq++;
      }
      if (!this.rows.includes(item)) this.rows.push(item);
    }
    return Promise.resolve(entity);
  }
}
