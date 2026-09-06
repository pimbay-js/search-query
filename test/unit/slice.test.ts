import { describe, it, expect } from 'vitest';
import { InMemoryArrayAdapter } from '../../src/adapters.js';
import { Slice, mapSlice, paginateSlice, paginateSliceOrThrow } from '../../src/slice.js';
import { SearchQueryError } from '../../src/errors.js';
import type { SliceAdapter, SliceChunk } from '../../src/slice.js';

describe('Slice', () => {
  it('getters reflect constructor arguments', () => {
    const slice = new Slice(['a', 'b'], 2, 2, 2, true, true);

    expect(slice.getData()).toEqual(['a', 'b']);
    expect(slice.getCurrentCount()).toBe(2);
    expect(slice.getCurrentPage()).toBe(2);
    expect(slice.getPageSize()).toBe(2);
    expect(slice.hasNextPage()).toBe(true);
    expect(slice.hasPreviousPage()).toBe(true);
    expect(slice.getCurrentOffset()).toBe(2);
  });

  it('is iterable over its data', () => {
    const slice = new Slice(['a', 'b'], 2, 1, 2, false, false);

    expect([...slice]).toEqual(['a', 'b']);
  });

  it('empty() returns a zeroed-out slice on page one', () => {
    const slice = Slice.empty();

    expect(slice.getData()).toEqual([]);
    expect(slice.getCurrentCount()).toBe(0);
    expect(slice.getCurrentPage()).toBe(1);
    expect(slice.getPageSize()).toBe(0);
    expect(slice.hasNextPage()).toBe(false);
    expect(slice.hasPreviousPage()).toBe(false);
    expect(slice.isOutOfRange()).toBe(false);
  });

  it.each([
    ['first page, no results', 1, 0, false],
    ['first page, has results', 1, 2, false],
    ['later page, has results', 2, 2, false],
    ['later page, no results', 2, 0, true],
  ] as const)('isOutOfRange — %s', (_name, currentPage, currentCount, expected) => {
    const slice = new Slice([], currentCount, currentPage, 2, false, currentPage > 1);

    expect(slice.isOutOfRange()).toBe(expected);
  });
});

describe('paginateSlice', () => {
  it.each([
    ['first page reports has more', 1, ['a', 'b'], true, false],
    ['last page reports no more', 2, ['c'], false, true],
  ] as const)('%s', async (_name, page, expectedData, expectedHasNext, expectedHasPrevious) => {
    const result = await paginateSlice(new InMemoryArrayAdapter(['a', 'b', 'c']), page, 2);

    expect(result.getData()).toEqual(expectedData);
    expect(result.hasNextPage()).toBe(expectedHasNext);
    expect(result.hasPreviousPage()).toBe(expectedHasPrevious);
  });

  it.each([0, -1, 1.5])('throws on invalid page %s', async (page) => {
    await expect(paginateSlice(new InMemoryArrayAdapter(['a']), page, 2)).rejects.toThrow(SearchQueryError);
  });

  it.each([0, -1, 1.5])('throws on invalid size %s', async (size) => {
    await expect(paginateSlice(new InMemoryArrayAdapter(['a']), 1, size)).rejects.toThrow(SearchQueryError);
  });

  it('a size of one is the smallest valid size', async () => {
    const result = await paginateSlice(new InMemoryArrayAdapter(['a', 'b']), 1, 1);

    expect(result.getData()).toEqual(['a']);
    expect(result.getPageSize()).toBe(1);
  });

  it('maps data and preserves pagination metadata', () => {
    const slice = new Slice(['a', 'b'], 2, 1, 2, true, false);

    const mapped = mapSlice(slice, (value) => value.toUpperCase());

    expect(mapped.getData()).toEqual(['A', 'B']);
    expect(mapped.getCurrentCount()).toBe(2);
    expect(mapped.getCurrentPage()).toBe(1);
    expect(mapped.getPageSize()).toBe(2);
    expect(mapped.hasNextPage()).toBe(true);
    expect(mapped.hasPreviousPage()).toBe(false);
  });

  it('propagates whatever hasMore/results a custom adapter reports', async () => {
    const adapter: SliceAdapter<string> = {
      pageSlice(): Promise<SliceChunk<string>> {
        return Promise.resolve({ results: ['a', 'b'], hasMore: false });
      },
    };

    const result = await paginateSlice(adapter, 1, 2);

    expect(result.getData()).toEqual(['a', 'b']);
    expect(result.getCurrentCount()).toBe(2);
  });
});

describe('paginateSliceOrThrow', () => {
  it('returns the result when in range', async () => {
    const result = await paginateSliceOrThrow(new InMemoryArrayAdapter(['a', 'b', 'c']), 1, 2);

    expect(result.getData()).toEqual(['a', 'b']);
  });

  it.each([
    ['invalid page', 0, 'Page index must be at least one, 0 given.'],
    ['page past the end', 3, 'Page 3 is out of range.'],
  ] as const)('throws — %s', async (_name, page, expectedMessage) => {
    await expect(paginateSliceOrThrow(new InMemoryArrayAdapter(['a', 'b', 'c']), page, 2)).rejects.toThrow(
      expectedMessage,
    );
  });
});
