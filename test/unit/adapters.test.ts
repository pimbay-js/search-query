import { describe, it, expect } from 'vitest';
import { InMemoryArrayAdapter } from '../../src/adapters.js';

describe('InMemoryArrayAdapter', () => {
  describe('count', () => {
    it('resolves to the number of items', async () => {
      const adapter = new InMemoryArrayAdapter(['a', 'b', 'c']);

      await expect(adapter.count()).resolves.toBe(3);
    });
  });

  describe('ids', () => {
    it('defaults to the zero-based index when extractId is omitted', async () => {
      const adapter = new InMemoryArrayAdapter(['a', 'b']);

      await expect(adapter.ids()).resolves.toEqual([0, 1]);
    });

    it('uses extractId when given', async () => {
      const adapter = new InMemoryArrayAdapter(['a', 'b'], (value) => value.toUpperCase());

      await expect(adapter.ids()).resolves.toEqual(['A', 'B']);
    });
  });

  describe('head', () => {
    it('returns the first `size` items', async () => {
      const adapter = new InMemoryArrayAdapter(['a', 'b', 'c', 'd']);

      await expect(adapter.head(2)).resolves.toEqual(['a', 'b']);
    });
  });

  describe('all', () => {
    it('returns every item', async () => {
      const adapter = new InMemoryArrayAdapter(['a', 'b']);

      await expect(adapter.all()).resolves.toEqual(['a', 'b']);
    });
  });

  describe('pageView', () => {
    it('reports totalCount alongside the sliced results', async () => {
      const adapter = new InMemoryArrayAdapter(['a', 'b', 'c', 'd', 'e']);

      const chunk = await adapter.pageView(2, 2);

      expect(chunk.results).toEqual(['c', 'd']);
      expect(chunk.totalCount).toBe(5);
    });
  });

  describe('pageSlice', () => {
    it.each([
      ['reports has more when an extra row exists', ['a', 'b', 'c'], 0, 2, ['a', 'b'], true],
      ['only reads one row ahead of size', ['a', 'b', 'c', 'd'], 0, 2, ['a', 'b'], true],
      ['on an exactly full last page has no more', ['a', 'b'], 0, 2, ['a', 'b'], false],
      ['reports no more on the last page', ['a', 'b', 'c'], 2, 2, ['c'], false],
    ] as const)('%s', async (_name, items, offset, size, expectedResults, expectedHasMore) => {
      const chunk = await new InMemoryArrayAdapter([...items]).pageSlice(offset, size);

      expect(chunk.results).toEqual(expectedResults);
      expect(chunk.hasMore).toBe(expectedHasMore);
    });
  });

  describe('pageAfter', () => {
    it.each([
      ['without cursor starts from the beginning', ['a', 'b', 'c'], null, 2, ['a', 'b'], true, '1'],
      ['only reads one row ahead of size', ['a', 'b', 'c', 'd'], null, 2, ['a', 'b'], true, '1'],
      ['on an exactly full last page has no more', ['a', 'b'], null, 2, ['a', 'b'], false, null],
      ['continues from a given cursor', ['a', 'b', 'c'], '1', 2, ['c'], false, null],
      [
        'with an unknown cursor restarts from the beginning',
        ['a', 'b', 'c'],
        'does-not-exist',
        2,
        ['a', 'b'],
        true,
        '1',
      ],
      ['cursor of 0 is a valid boundary index', ['a', 'b', 'c'], '0', 2, ['b', 'c'], false, null],
      ['a negative cursor restarts from the beginning', ['a', 'b', 'c'], '-1', 2, ['a', 'b'], true, '1'],
      [
        'a "-0" cursor restarts from the beginning like any other negative cursor',
        ['a', 'b', 'c'],
        '-0',
        2,
        ['a', 'b'],
        true,
        '1',
      ],
      [
        'a negative cursor whose successor is not zero also restarts from the beginning',
        ['a', 'b', 'c'],
        '-3',
        2,
        ['a', 'b'],
        true,
        '1',
      ],
      ['a non-integer cursor restarts from the beginning', ['a', 'b', 'c'], '1.5', 2, ['a', 'b'], true, '1'],
      ['a cursor equal to the item count restarts from the beginning', ['a', 'b', 'c'], '3', 2, ['a', 'b'], true, '1'],
    ] as const)('%s', async (_name, items, cursor, size, expectedResults, expectedHasMore, expectedNextCursor) => {
      const chunk = await new InMemoryArrayAdapter([...items]).pageAfter(cursor, size);

      expect(chunk.results).toEqual(expectedResults);
      expect(chunk.hasMore).toBe(expectedHasMore);
      expect(chunk.nextCursor).toBe(expectedNextCursor);
    });
  });
});
