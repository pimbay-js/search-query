# Errors Reference

Every failure this package throws is a `SearchQueryError` — there's no wider hierarchy and no wrapped upstream errors. Only ever thrown directly, never as a `cause`-wrapper around something else.

```ts
import { SearchQueryError } from '@pimbay/search-query';

try {
  await paginatePageOrThrow(adapter, page, size);
} catch (e) {
  if (e instanceof SearchQueryError) {
    // e.message is a human-readable, complete sentence — safe to log or surface as-is.
    // e.name === 'SearchQueryError' for all failure modes; distinguish by message/named constructor if needed.
  }
}
```

## Catching specific failure modes

All failure modes are input-validation or range failures — none are retryable, since retrying with the same input produces the same error.

| Named constructor                             | Safe to retry? | Notes                                                                                                                                                                                                                     |
| --------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SearchQueryError.invalidPageIndex()`         | No             | `page` argument was not a positive integer.                                                                                                                                                                               |
| `SearchQueryError.invalidSize()`              | No             | `size` argument was not a positive integer.                                                                                                                                                                               |
| `SearchQueryError.emptyCursor()`              | No             | An empty string was passed as a cursor; use `null` for "start from the beginning" instead.                                                                                                                                |
| `SearchQueryError.outOfRange()`               | No             | Raised by `paginatePageOrThrow()`/`paginateSliceOrThrow()` only, when the requested page is past the last available page — not by `paginatePage()`/`paginateSlice()` themselves, which return a checkable result instead. |
| `SearchQueryError.invalidSearchTermsConfig()` | No             | A `SearchTermsConfig` passed to `parseSearchTerms`/`parseSearchTermsString` failed validation (e.g. conflicting marker characters).                                                                                       |
