/**
 * This file is part of the PimBay Search Query library.
 *
 * @author Jan Sarmir <sarmir@pimbay.dev>
 * @link   https://pimbay.dev
 *
 * For the full license information, see the LICENSE file.
 */
import { SearchQueryError } from './errors.js';

/** An internal computation intermediate consumed by paginateCursor(), not the public result type. */
export interface CursorChunk<T> {
  readonly results: readonly T[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

export interface CursorAdapter<T> {
  pageAfter(cursor: string | null, size: number): Promise<CursorChunk<T>>;
}

/**
 * Forward-only (no previousCursor) — add additively if bidirectional cursors are needed later.
 * No currentPage/pageCount/totalCount/currentOffset; the cursor model has none of these concepts.
 */
export interface CursorResult<T> extends Iterable<T> {
  getData(): readonly T[];
  getCurrentCount(): number;
  getPageSize(): number;
  getNextCursor(): string | null;
  hasNextPage(): boolean;
}

export class Cursor<T> implements CursorResult<T> {
  constructor(
    private readonly data: readonly T[],
    private readonly currentCountValue: number,
    private readonly pageSizeValue: number,
    private readonly nextCursorValue: string | null,
    private readonly hasNextPageValue: boolean,
  ) {}

  static empty<T>(pageSize: number): Cursor<T> {
    return new Cursor<T>([], 0, pageSize, null, false);
  }

  getData(): readonly T[] {
    return this.data;
  }

  getCurrentCount(): number {
    return this.currentCountValue;
  }

  getPageSize(): number {
    return this.pageSizeValue;
  }

  getNextCursor(): string | null {
    return this.nextCursorValue;
  }

  hasNextPage(): boolean {
    return this.hasNextPageValue;
  }

  [Symbol.iterator](): Iterator<T> {
    return this.data[Symbol.iterator]();
  }
}

export function mapCursor<T, R>(cursorResult: CursorResult<T>, mapping: (value: T) => R): Cursor<R> {
  return new Cursor<R>(
    cursorResult.getData().map(mapping),
    cursorResult.getCurrentCount(),
    cursorResult.getPageSize(),
    cursorResult.getNextCursor(),
    cursorResult.hasNextPage(),
  );
}

export async function paginateCursor<T>(
  adapter: CursorAdapter<T>,
  cursor: string | null,
  size: number,
): Promise<Cursor<T>> {
  if (cursor === '') {
    throw SearchQueryError.emptyCursor();
  }

  if (!Number.isInteger(size) || size < 1) {
    throw SearchQueryError.invalidSize(size);
  }

  const chunk = await adapter.pageAfter(cursor, size);

  if (chunk.nextCursor === '') {
    throw SearchQueryError.emptyCursor();
  }

  if (chunk.results.length === 0) {
    return Cursor.empty<T>(size);
  }

  return new Cursor<T>(chunk.results, chunk.results.length, size, chunk.nextCursor, chunk.hasMore);
}
