/**
 * This file is part of the PimBay Search Query library.
 *
 * @author Jan Sarmir <sarmir@pimbay.dev>
 * @link   https://pimbay.dev
 *
 * For the full license information, see the LICENSE file.
 */

/** Only constructible via the static factories below. */
export class SearchQueryError extends Error {
  private constructor(message: string) {
    super(message);
    this.name = 'SearchQueryError';
  }

  static invalidPageIndex(page: number): SearchQueryError {
    return new SearchQueryError(`Page index must be at least one, ${String(page)} given.`);
  }

  static invalidSize(size: number): SearchQueryError {
    return new SearchQueryError(`Size must be a positive integer, ${String(size)} given.`);
  }

  static emptyCursor(): SearchQueryError {
    return new SearchQueryError('Cursor must not be empty.');
  }

  /** Raised by paginatePageOrThrow()/paginateSliceOrThrow(), not by paginatePage()/paginateSlice() themselves. */
  static outOfRange(page: number): SearchQueryError {
    return new SearchQueryError(`Page ${String(page)} is out of range.`);
  }

  static invalidSearchTermsConfig(reason: string): SearchQueryError {
    return new SearchQueryError(`Invalid SearchTermsConfig: ${reason}.`);
  }
}
