import { describe, it, expect } from 'vitest';
import { InMemoryArrayAdapter } from '../../src/adapters.js';
import { Page, mapPage, paginatePage, paginatePageOrThrow } from '../../src/page.js';
import { SearchQueryError } from '../../src/errors.js';

describe('Page', () => {
  it('getters reflect constructor arguments', () => {
    const page = new Page(['a', 'b'], 2, 1, 2, true, false, 3, 5);

    expect(page.getData()).toEqual(['a', 'b']);
    expect(page.getCurrentCount()).toBe(2);
    expect(page.getCurrentPage()).toBe(1);
    expect(page.getPageSize()).toBe(2);
    expect(page.hasNextPage()).toBe(true);
    expect(page.hasPreviousPage()).toBe(false);
    expect(page.getPageCount()).toBe(3);
    expect(page.getTotalCount()).toBe(5);
  });

  it.each([
    ['first page', 1, 2, 0],
    ['third page of size ten', 3, 10, 20],
  ] as const)('currentOffset — %s', (_name, currentPage, pageSize, expectedOffset) => {
    const page = new Page([], 0, currentPage, pageSize, false, false, 1, 0);

    expect(page.getCurrentOffset()).toBe(expectedOffset);
  });

  it('isOutOfRange is inherited from Slice', () => {
    const withinRange = new Page(['a', 'b'], 2, 2, 2, false, true, 2, 3);
    const beyondPageCount = new Page([], 0, 4, 2, false, true, 2, 3);

    expect(withinRange.isOutOfRange()).toBe(false);
    expect(beyondPageCount.isOutOfRange()).toBe(true);
  });

  it('empty() returns a zeroed-out page on page one', () => {
    const page = Page.empty();

    expect(page.getData()).toEqual([]);
    expect(page.getCurrentCount()).toBe(0);
    expect(page.getCurrentPage()).toBe(1);
    expect(page.getPageSize()).toBe(0);
    expect(page.hasNextPage()).toBe(false);
    expect(page.hasPreviousPage()).toBe(false);
    expect(page.getPageCount()).toBe(1);
    expect(page.getTotalCount()).toBe(0);
    expect(page.isOutOfRange()).toBe(false);
  });
});

describe('paginatePage', () => {
  it.each([
    ['first page of three', 1, ['a', 'b'], 2, true, false, false],
    ['last page has a remainder count', 3, ['e'], 1, false, true, false],
    ['page beyond page count is out of range', 4, [], 0, false, true, true],
  ] as const)(
    'paginates five items in pages of two — %s',
    async (
      _name,
      page,
      expectedData,
      expectedCurrentCount,
      expectedHasNext,
      expectedHasPrevious,
      expectedOutOfRange,
    ) => {
      const result = await paginatePage(new InMemoryArrayAdapter(['a', 'b', 'c', 'd', 'e']), page, 2);

      expect(result.getData()).toEqual(expectedData);
      expect(result.getCurrentCount()).toBe(expectedCurrentCount);
      expect(result.getPageCount()).toBe(3);
      expect(result.getTotalCount()).toBe(5);
      expect(result.hasNextPage()).toBe(expectedHasNext);
      expect(result.hasPreviousPage()).toBe(expectedHasPrevious);
      expect(result.isOutOfRange()).toBe(expectedOutOfRange);
    },
  );

  it.each([
    [1, false],
    [2, true],
  ] as const)('empty adapter — page %i', async (page, expectedHasPrevious) => {
    const result = await paginatePage(new InMemoryArrayAdapter([]), page, 2);

    expect(result.getData()).toEqual([]);
    expect(result.getCurrentCount()).toBe(0);
    expect(result.getTotalCount()).toBe(0);
    expect(result.getPageCount()).toBe(1);
    expect(result.hasNextPage()).toBe(false);
    expect(result.hasPreviousPage()).toBe(expectedHasPrevious);
  });

  it('page count rounds up, not to nearest', async () => {
    const result = await paginatePage(new InMemoryArrayAdapter(['a', 'b', 'c', 'd']), 1, 3);

    expect(result.getPageCount()).toBe(2);
  });

  it.each([0, -1, 1.5])('throws on invalid page %s', async (page) => {
    await expect(paginatePage(new InMemoryArrayAdapter(['a']), page, 2)).rejects.toThrow(SearchQueryError);
  });

  it.each([0, -1, 1.5])('throws on invalid size %s', async (size) => {
    await expect(paginatePage(new InMemoryArrayAdapter(['a']), 1, size)).rejects.toThrow(SearchQueryError);
  });

  it('a size of one is the smallest valid size', async () => {
    const result = await paginatePage(new InMemoryArrayAdapter(['a', 'b']), 1, 1);

    expect(result.getData()).toEqual(['a']);
    expect(result.getPageSize()).toBe(1);
  });

  it('maps data and preserves pagination metadata', () => {
    const page = new Page(['a', 'b'], 2, 1, 2, true, false, 3, 5);

    const mapped = mapPage(page, (value) => value.toUpperCase());

    expect(mapped.getData()).toEqual(['A', 'B']);
    expect(mapped.getCurrentCount()).toBe(2);
    expect(mapped.getCurrentPage()).toBe(1);
    expect(mapped.getPageSize()).toBe(2);
    expect(mapped.hasNextPage()).toBe(true);
    expect(mapped.hasPreviousPage()).toBe(false);
    expect(mapped.getPageCount()).toBe(3);
    expect(mapped.getTotalCount()).toBe(5);
  });
});

describe('paginatePageOrThrow', () => {
  it('returns the result when in range', async () => {
    const result = await paginatePageOrThrow(new InMemoryArrayAdapter(['a', 'b', 'c']), 1, 2);

    expect(result.getData()).toEqual(['a', 'b']);
  });

  it.each([
    ['invalid page', 0, 'Page index must be at least one, 0 given.'],
    ['page past the end', 4, 'Page 4 is out of range.'],
  ] as const)('throws — %s', async (_name, page, expectedMessage) => {
    await expect(paginatePageOrThrow(new InMemoryArrayAdapter(['a', 'b', 'c']), page, 2)).rejects.toThrow(
      expectedMessage,
    );
  });
});
