/**
 * This file is part of the PimBay Search Query library.
 *
 * @author Jan Sarmir <sarmir@pimbay.dev>
 * @link   https://pimbay.dev
 *
 * For the full license information, see the LICENSE file.
 */
import { SearchQueryError } from './errors.js';
import { Slice } from './slice.js';
import type { SliceResult } from './slice.js';

/** An internal computation intermediate consumed by paginatePage(), not the public result type. */
export interface PageChunk<T> {
  readonly results: readonly T[];
  readonly totalCount: number;
}

/** Strictly for bounded, page-numbered navigation. Not meant to also serve "give me everything" reads. */
export interface PageAdapter<T> {
  pageView(offset: number, size: number): Promise<PageChunk<T>>;
}

export interface PageResult<T> extends SliceResult<T> {
  getTotalCount(): number;
  getPageCount(): number;
}

export class Page<T> extends Slice<T> implements PageResult<T> {
  constructor(
    data: readonly T[],
    currentCount: number,
    currentPage: number,
    pageSize: number,
    hasNextPage: boolean,
    hasPreviousPage: boolean,
    private readonly pageCountValue: number,
    private readonly totalCountValue: number,
  ) {
    super(data, currentCount, currentPage, pageSize, hasNextPage, hasPreviousPage);
  }

  static empty<T>(): Page<T> {
    return new Page<T>([], 0, 1, 0, false, false, 1, 0);
  }

  getTotalCount(): number {
    return this.totalCountValue;
  }

  getPageCount(): number {
    return this.pageCountValue;
  }
}

export function mapPage<T, R>(pageResult: PageResult<T>, mapping: (value: T) => R): Page<R> {
  return new Page<R>(
    pageResult.getData().map(mapping),
    pageResult.getCurrentCount(),
    pageResult.getCurrentPage(),
    pageResult.getPageSize(),
    pageResult.hasNextPage(),
    pageResult.hasPreviousPage(),
    pageResult.getPageCount(),
    pageResult.getTotalCount(),
  );
}

export async function paginatePage<T>(adapter: PageAdapter<T>, page: number, size: number): Promise<Page<T>> {
  if (!Number.isInteger(page) || page < 1) {
    throw SearchQueryError.invalidPageIndex(page);
  }

  if (!Number.isInteger(size) || size < 1) {
    throw SearchQueryError.invalidSize(size);
  }

  const offset = (page - 1) * size;
  const chunk = await adapter.pageView(offset, size);

  if (chunk.totalCount === 0) {
    return new Page<T>([], 0, page, size, false, page > 1, 1, 0);
  }

  const pageCount = Math.ceil(chunk.totalCount / size);
  const currentCount = page > pageCount ? 0 : page < pageCount ? size : chunk.totalCount - (pageCount - 1) * size;

  return new Page<T>(chunk.results, currentCount, page, size, page < pageCount, page > 1, pageCount, chunk.totalCount);
}

export async function paginatePageOrThrow<T>(adapter: PageAdapter<T>, page: number, size: number): Promise<Page<T>> {
  const result = await paginatePage(adapter, page, size);

  if (result.isOutOfRange()) {
    throw SearchQueryError.outOfRange(page);
  }

  return result;
}
