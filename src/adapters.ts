/**
 * This file is part of the PimBay Search Query library.
 *
 * @author Jan Sarmir <sarmir@pimbay.dev>
 * @link   https://pimbay.dev
 *
 * For the full license information, see the LICENSE file.
 */
import type { CursorAdapter, CursorChunk } from './cursor.js';
import type { PageAdapter, PageChunk } from './page.js';
import type { SliceAdapter, SliceChunk } from './slice.js';

/**
 * Unbounded read of an entire result set. Deliberately a separate interface from HeadableAdapter —
 * implementing HeadableAdapter must never implicitly grant unbounded reads; an adapter opts into
 * this capability explicitly.
 */
export interface AllAdapter<T> {
  all(): Promise<readonly T[]>;
}

export interface CountableAdapter {
  count(): Promise<number>;
}

/**
 * Bounded read from the start of a result set — unrelated to page navigation, for known-small
 * result sets (e.g. a filtered listing forwarded to a view helper).
 */
export interface HeadableAdapter<T> {
  head(size: number): Promise<readonly T[]>;
}

export interface IdentifiableAdapter<Id extends number | string = number> {
  ids(): Promise<Id[]>;
}

/**
 * Reference implementation over a plain array — for tests and small, already-loaded collections.
 * Cursors are the numeric index of the last returned item, encoded as a string. `extractId`
 * defaults to the item's own index when omitted.
 */
export class InMemoryArrayAdapter<T, Id extends number | string = number>
  implements
    PageAdapter<T>,
    SliceAdapter<T>,
    CursorAdapter<T>,
    CountableAdapter,
    IdentifiableAdapter<Id>,
    HeadableAdapter<T>,
    AllAdapter<T>
{
  constructor(
    private readonly items: readonly T[],
    private readonly extractId?: (item: T) => Id,
  ) {}

  count(): Promise<number> {
    return Promise.resolve(this.items.length);
  }

  ids(): Promise<Id[]> {
    const extractId = this.extractId;
    const ids =
      extractId !== undefined
        ? this.items.map((item) => extractId(item))
        : (this.items.map((_, index) => index) as unknown as Id[]);

    return Promise.resolve(ids);
  }

  head(size: number): Promise<readonly T[]> {
    return Promise.resolve(this.items.slice(0, size));
  }

  all(): Promise<readonly T[]> {
    return Promise.resolve(this.items);
  }

  pageView(offset: number, size: number): Promise<PageChunk<T>> {
    return Promise.resolve({ results: this.items.slice(offset, offset + size), totalCount: this.items.length });
  }

  pageSlice(offset: number, size: number): Promise<SliceChunk<T>> {
    return Promise.resolve(this.takeAhead(offset, size));
  }

  pageAfter(cursor: string | null, size: number): Promise<CursorChunk<T>> {
    const startIndex = this.resolveCursorStart(cursor);
    const { results, hasMore } = this.takeAhead(startIndex, size);
    const nextCursor = hasMore ? String(startIndex + results.length - 1) : null;

    return Promise.resolve({ results, nextCursor, hasMore });
  }

  /** Fetches `size + 1` rows from `offset` and reports whether more than `size` were found. */
  private takeAhead(offset: number, size: number): { results: readonly T[]; hasMore: boolean } {
    const slice = this.items.slice(offset, offset + size + 1);
    const hasMore = slice.length > size;

    return { results: hasMore ? slice.slice(0, size) : slice, hasMore };
  }

  private resolveCursorStart(cursor: string | null): number {
    if (cursor === null) {
      return 0;
    }

    const position = Number(cursor);
    const isValidIndex =
      Number.isInteger(position) && position >= 0 && !Object.is(position, -0) && position < this.items.length;

    // Stale/unknown cursor (can't happen within one instance's lifetime, since `items` never
    // changes) — restart from the beginning rather than throw.
    return isValidIndex ? position + 1 : 0;
  }
}
