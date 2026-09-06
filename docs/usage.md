# Usage Reference

The README's Usage section is deliberately minimal — one short, runnable example per export.
This file holds the one example that doesn't fit there: the intended shape of a real repository against a real datasource.

## A repository, shaped for a real datasource

Filtering/sorting stays entirely in your own `Query` class and repository methods; the library never sees either.
A `Sort` enum (bare `ASC`/`DESC`) is your own project's concern too — not exported by this library, since it never inspects or acts on it.
Unlike Doctrine's mutable `QueryBuilder`, a Drizzle query builder isn't something you build once and reuse for both a count and a row query.

```ts
import { paginatePageOrThrow, type Page } from '@pimbay/search-query';
import { DrizzleSimpleAdapter } from '@pimbay/search-query-drizzle';
import { and, asc, desc, inArray, sql, type SQL } from 'drizzle-orm';
import { db } from '../db.js';
import { requestTable } from '../schema.js';

enum Sort {
  Asc = 'asc',
  Desc = 'desc',
}

class RequestsQuery {
  constructor(
    readonly siteZones?: readonly string[],
    readonly siteSites?: readonly string[],
    readonly siteLocales?: readonly string[],
    readonly sort: { readonly createdAt?: Sort } = {},
  ) {}
}

class RequestsSearchRepository {
  async paginate(query: RequestsQuery, page: number, size: number): Promise<Page<RequestRow>> {
    const scope = this.filter(query);

    const adapter = new DrizzleSimpleAdapter(
      () =>
        db
          .select({ count: sql<number>`count(*)::int`.as('count') })
          .from(requestTable)
          .$dynamic()
          .where(scope),
      (row) => row.count,
      () => this.order(db.select().from(requestTable).$dynamic().where(scope), query),
    );

    return paginatePageOrThrow(adapter, page, size);
  }

  private filter(query: RequestsQuery): SQL | undefined {
    const conditions = [
      query.siteZones ? inArray(requestTable.siteZone, query.siteZones) : undefined,
      query.siteSites ? inArray(requestTable.siteSite, query.siteSites) : undefined,
      query.siteLocales ? inArray(requestTable.siteLocale, query.siteLocales) : undefined,
    ].filter((condition) => condition !== undefined);

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private order(qb: RequestRowQuery, query: RequestsQuery): RequestRowQuery {
    if (query.sort.createdAt) {
      qb = qb.orderBy(query.sort.createdAt === Sort.Asc ? asc(requestTable.createdAt) : desc(requestTable.createdAt));
    }

    return qb.orderBy(desc(requestTable.id));
  }
}
```

## Edge cases

### Requesting a page past the end

`paginatePage`/`paginateSlice` never throw for an out-of-range page — they return a result with an empty `getData()` and `hasNextPage() === false`, which the caller can check explicitly with `isOutOfRange()`. Use `paginatePageOrThrow`/`paginateSliceOrThrow` instead when a hard failure (`SearchQueryError.outOfRange()`) is what you actually want.

### A stale or unknown cursor

`paginateCursor` treats a cursor it doesn't recognize as a request to restart from the beginning rather than throwing — a cursor going stale (e.g. the underlying data changed) is an expected, not exceptional, condition for forward-only navigation. An empty string is different: it's rejected with `SearchQueryError.emptyCursor()`, since `null` is the documented way to say "start from the beginning."

### `Page` vs `Slice` vs `Cursor`

Reach for `Page` only when the UI needs `totalCount`/`pageCount` (e.g. "page 3 of 12"); its adapter always pays for a count query. `Slice` gives the same page-numbered navigation without that cost, at the price of not knowing the total. `Cursor` drops page-numbered navigation entirely — no `totalCount`, `pageCount`, or `currentPage` — for feeds where only "is there more" matters.
