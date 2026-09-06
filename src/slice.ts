/**
 * This file is part of the PimBay Search Query library.
 *
 * @author Jan Sarmir <sarmir@pimbay.dev>
 * @link   https://pimbay.dev
 *
 * For the full license information, see the LICENSE file.
 */
import { SearchQueryError } from './errors.js';

/** An internal computation intermediate consumed by paginateSlice(), not the public result type. */
export interface SliceChunk<T> {
  readonly results: readonly T[];
  readonly hasMore: boolean;
}

export interface SliceAdapter<T> {
  /**
   * Implementations are expected to determine `hasMore` cheaply (e.g. by fetching `size + 1` rows
   * and dropping the extra one), not via a separate count query — that's the entire point of the
   * Slice family over Page.
   */
  pageSlice(offset: number, size: number): Promise<SliceChunk<T>>;
}

/** No totalCount/pageCount — unknown without a separate count query; that's the distinction from Page. */
export interface SliceResult<T> extends Iterable<T> {
  getData(): readonly T[];
  getCurrentCount(): number;
  getCurrentPage(): number;
  getPageSize(): number;
  hasNextPage(): boolean;
  hasPreviousPage(): boolean;
  getCurrentOffset(): number;
  isOutOfRange(): boolean;
}

export class Slice<T> implements SliceResult<T> {
  constructor(
    private readonly data: readonly T[],
    private readonly currentCountValue: number,
    private readonly currentPageValue: number,
    private readonly pageSizeValue: number,
    private readonly hasNextPageValue: boolean,
    private readonly hasPreviousPageValue: boolean,
  ) {}

  static empty<T>(): Slice<T> {
    return new Slice<T>([], 0, 1, 0, false, false);
  }

  getData(): readonly T[] {
    return this.data;
  }

  getCurrentCount(): number {
    return this.currentCountValue;
  }

  getCurrentPage(): number {
    return this.currentPageValue;
  }

  getPageSize(): number {
    return this.pageSizeValue;
  }

  hasNextPage(): boolean {
    return this.hasNextPageValue;
  }

  hasPreviousPage(): boolean {
    return this.hasPreviousPageValue;
  }

  getCurrentOffset(): number {
    return this.pageSizeValue * (this.currentPageValue - 1);
  }

  isOutOfRange(): boolean {
    return this.currentPageValue > 1 && this.currentCountValue === 0;
  }

  [Symbol.iterator](): Iterator<T> {
    return this.data[Symbol.iterator]();
  }
}

export function mapSlice<T, R>(sliceResult: SliceResult<T>, mapping: (value: T) => R): Slice<R> {
  return new Slice<R>(
    sliceResult.getData().map(mapping),
    sliceResult.getCurrentCount(),
    sliceResult.getCurrentPage(),
    sliceResult.getPageSize(),
    sliceResult.hasNextPage(),
    sliceResult.hasPreviousPage(),
  );
}

export async function paginateSlice<T>(adapter: SliceAdapter<T>, page: number, size: number): Promise<Slice<T>> {
  if (!Number.isInteger(page) || page < 1) {
    throw SearchQueryError.invalidPageIndex(page);
  }

  if (!Number.isInteger(size) || size < 1) {
    throw SearchQueryError.invalidSize(size);
  }

  const offset = (page - 1) * size;
  const chunk = await adapter.pageSlice(offset, size);

  return new Slice<T>(chunk.results, chunk.results.length, page, size, chunk.hasMore, page > 1);
}

export async function paginateSliceOrThrow<T>(adapter: SliceAdapter<T>, page: number, size: number): Promise<Slice<T>> {
  const result = await paginateSlice(adapter, page, size);

  if (result.isOutOfRange()) {
    throw SearchQueryError.outOfRange(page);
  }

  return result;
}
