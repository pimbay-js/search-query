import { describe, it, expect } from 'vitest';
import { InMemoryArrayAdapter } from '../../src/adapters.js';
import { Cursor, mapCursor, paginateCursor } from '../../src/cursor.js';
import { SearchQueryError } from '../../src/errors.js';
import type { CursorAdapter, CursorChunk } from '../../src/cursor.js';

describe('Cursor', () => {
  it('getters reflect constructor arguments', () => {
    const cursor = new Cursor(['a', 'b'], 2, 2, 'abc', true);

    expect(cursor.getData()).toEqual(['a', 'b']);
    expect(cursor.getCurrentCount()).toBe(2);
    expect(cursor.getPageSize()).toBe(2);
    expect(cursor.getNextCursor()).toBe('abc');
    expect(cursor.hasNextPage()).toBe(true);
  });

  it('is iterable over its data', () => {
    const cursor = new Cursor(['a', 'b'], 2, 2, null, false);

    expect([...cursor]).toEqual(['a', 'b']);
  });

  it('empty() returns a zeroed-out cursor with no next page', () => {
    const cursor = Cursor.empty(10);

    expect(cursor.getData()).toEqual([]);
    expect(cursor.getCurrentCount()).toBe(0);
    expect(cursor.getPageSize()).toBe(10);
    expect(cursor.getNextCursor()).toBeNull();
    expect(cursor.hasNextPage()).toBe(false);
  });
});

describe('paginateCursor', () => {
  it('first page without a cursor', async () => {
    const result = await paginateCursor(new InMemoryArrayAdapter(['a', 'b', 'c']), null, 2);

    expect(result.getData()).toEqual(['a', 'b']);
    expect(result.getCurrentCount()).toBe(2);
    expect(result.hasNextPage()).toBe(true);
    expect(result.getNextCursor()).not.toBeNull();
  });

  it('empty adapter returns an empty result', async () => {
    const result = await paginateCursor(new InMemoryArrayAdapter([]), null, 2);

    expect(result.getData()).toEqual([]);
    expect(result.getCurrentCount()).toBe(0);
    expect(result.hasNextPage()).toBe(false);
    expect(result.getNextCursor()).toBeNull();
  });

  it('throws on an empty-string cursor', async () => {
    await expect(paginateCursor(new InMemoryArrayAdapter(['a', 'b']), '', 2)).rejects.toThrow(
      'Cursor must not be empty.',
    );
  });

  it('throws when the adapter reports an empty-string next cursor', async () => {
    const adapter: CursorAdapter<string> = {
      pageAfter(): Promise<CursorChunk<string>> {
        return Promise.resolve({ results: ['a'], nextCursor: '', hasMore: true });
      },
    };

    await expect(paginateCursor(adapter, null, 2)).rejects.toThrow('Cursor must not be empty.');
  });

  it.each([0, -1, 1.5])('throws on invalid size %s', async (size) => {
    await expect(paginateCursor(new InMemoryArrayAdapter(['a']), null, size)).rejects.toThrow(SearchQueryError);
  });

  it('a size of one is the smallest valid size', async () => {
    const result = await paginateCursor(new InMemoryArrayAdapter(['a', 'b']), null, 1);

    expect(result.getData()).toEqual(['a']);
    expect(result.getPageSize()).toBe(1);
  });

  it('normalizes empty results regardless of what the chunk claims', async () => {
    const adapter: CursorAdapter<string> = {
      pageAfter(): Promise<CursorChunk<string>> {
        return Promise.resolve({ results: [], nextCursor: 'stale', hasMore: true });
      },
    };

    const result = await paginateCursor(adapter, null, 2);

    expect(result.getData()).toEqual([]);
    expect(result.hasNextPage()).toBe(false);
    expect(result.getNextCursor()).toBeNull();
  });

  it('continues from a given cursor', async () => {
    const adapter = new InMemoryArrayAdapter(['a', 'b', 'c']);
    const first = await paginateCursor(adapter, null, 2);
    const second = await paginateCursor(adapter, first.getNextCursor(), 2);

    expect(second.getData()).toEqual(['c']);
    expect(second.hasNextPage()).toBe(false);
    expect(second.getNextCursor()).toBeNull();
  });

  it('maps data and preserves pagination metadata', () => {
    const cursor = new Cursor(['a', 'b'], 2, 2, 'abc', true);

    const mapped = mapCursor(cursor, (value) => value.toUpperCase());

    expect(mapped.getData()).toEqual(['A', 'B']);
    expect(mapped.getCurrentCount()).toBe(2);
    expect(mapped.getPageSize()).toBe(2);
    expect(mapped.getNextCursor()).toBe('abc');
    expect(mapped.hasNextPage()).toBe(true);
  });
});
