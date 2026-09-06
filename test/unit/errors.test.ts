import { describe, it, expect } from 'vitest';
import { SearchQueryError } from '../../src/errors.js';

describe('SearchQueryError', () => {
  it('invalidPageIndex includes the given page', () => {
    expect(SearchQueryError.invalidPageIndex(0).message).toBe('Page index must be at least one, 0 given.');
  });

  it('invalidSize includes the given size', () => {
    expect(SearchQueryError.invalidSize(-1).message).toBe('Size must be a positive integer, -1 given.');
  });

  it('emptyCursor has a fixed message', () => {
    expect(SearchQueryError.emptyCursor().message).toBe('Cursor must not be empty.');
  });

  it('outOfRange includes the given page', () => {
    expect(SearchQueryError.outOfRange(4).message).toBe('Page 4 is out of range.');
  });

  it('invalidSearchTermsConfig includes the given reason', () => {
    expect(SearchQueryError.invalidSearchTermsConfig('likeChar must not be empty').message).toBe(
      'Invalid SearchTermsConfig: likeChar must not be empty.',
    );
  });

  it('is an instance of Error', () => {
    expect(SearchQueryError.emptyCursor()).toBeInstanceOf(Error);
  });

  it('name is set to SearchQueryError', () => {
    expect(SearchQueryError.emptyCursor().name).toBe('SearchQueryError');
  });
});
