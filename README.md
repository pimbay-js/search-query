# @pimbay/search-query

[![npm version](https://img.shields.io/npm/v/%40pimbay%2Fsearch-query?style=flat-square&color=blue)](https://www.npmjs.com/package/@pimbay/search-query)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![License](https://img.shields.io/npm/l/%40pimbay%2Fsearch-query?style=flat-square&color=green)](LICENSE)
[![Code Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen?style=flat-square)](https://codeberg.org/pimbay-js/search-query)
[![Mutation Score](https://img.shields.io/badge/MSI-100%25-brightgreen?style=flat-square)](https://codeberg.org/pimbay-js/search-query)

Framework-agnostic pagination and search-terms parsing for TypeScript/JavaScript.

No query-builder or ORM dependency — you implement one small adapter interface (`pageView`/`pageSlice`/`pageAfter`/`count`/`ids`/`head`/`all`, whichever you need) against your own data source, and this library gives you back a typed, immutable result object.

Three pagination styles are supported, each with its own result type and adapter interface:

- **Page** (`paginatePage`) — classic page-numbered navigation with `totalCount`/`pageCount`. Needs a count query.
- **Slice** (`paginateSlice`) — page-numbered navigation without a count query (`hasMore` is determined by over-fetching by one row). Cheaper than Page when you don't need `totalCount`.
- **Cursor** (`paginateCursor`) — forward-only cursor navigation, no `totalCount`/`pageCount`/`currentPage` concepts at all.

Plus `parseSearchTerms`/`parseSearchTermsString` — pure string parsing of a search-terms input into equals/notEquals/likes/notLikes buckets (leading negation marker, embedded wildcard marker), with no SQL or column awareness of its own. A datasource-specific adapter package (e.g. [`@pimbay/search-query-drizzle`](https://www.npmjs.com/package/@pimbay/search-query-drizzle)) turns the parsed result into actual query conditions.

## Installation

```bash
npm install @pimbay/search-query
```

## Usage

### `paginatePage`

Classic page-numbered navigation. Needs a count query.

```ts
import { paginatePage, type PageAdapter, type PageChunk } from '@pimbay/search-query';

class MyAdapter implements PageAdapter<MyRow> {
  async pageView(offset: number, size: number): Promise<PageChunk<MyRow>> {
    const [results, totalCount] = await Promise.all([myQuery(offset, size), myCount()]);

    return { results, totalCount };
  }
}

const page = await paginatePage(new MyAdapter(), /* page */ 1, /* size */ 20);

page.getData(); // MyRow[]
page.getTotalCount();
page.getPageCount();
page.hasNextPage();
```

`paginateSlice`/`paginateCursor` follow the same shape against `SliceAdapter`/`CursorAdapter` instead — see [docs/usage.md](docs/usage.md) for a `Slice` example against a real datasource.

If a hard failure is exactly what you want, `paginatePageOrThrow`/`paginateSliceOrThrow` do the `isOutOfRange()` check for you and throw `SearchQueryError` (`outOfRange`) instead of returning a result you'd have to check yourself.

An `InMemoryArrayAdapter` is included — it implements every adapter interface at once, useful for tests and small, already-loaded collections without writing your own adapter.

### `parseSearchTermsString`

Parses a search-terms input string into equals/notEquals/likes/notLikes buckets, with no SQL or column awareness of its own.

```ts
import { createSearchTermsConfig, parseSearchTermsString } from '@pimbay/search-query';

const config = createSearchTermsConfig(); // anywhere: true, minLength: 3, likeChar: '*', ignoreChar: '-'
const parsed = parseSearchTermsString('foo* -bar baz*', config);
// { equals: ['baz*']... } — see the type for the exact shape
```

Full usage reference (real-datasource example, advanced usage, edge cases): **[docs/usage.md](docs/usage.md)**.

## Adapters for a specific datasource

This package only defines the adapter _interfaces_ — it has zero runtime dependencies. Implementing `PageAdapter`/`SliceAdapter`/etc. against your own query layer is normal and expected. For Drizzle ORM specifically, see [`@pimbay/search-query-drizzle`](https://www.npmjs.com/package/@pimbay/search-query-drizzle), which provides `DrizzleSimpleAdapter`/`DrizzleIdentityAdapter` plus a search-terms-to-SQL-condition builder.

## Errors

Every failure mode is a named constructor on `SearchQueryError`.

| Error                                         | Raised by                                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `SearchQueryError.invalidPageIndex()`         | `paginatePage()`/`paginateSlice()` — `page` not a positive integer                             |
| `SearchQueryError.invalidSize()`              | `paginatePage()`/`paginateSlice()`/`paginateCursor()` — `size` not a positive integer          |
| `SearchQueryError.emptyCursor()`              | `paginateCursor()` — empty string passed as cursor (use `null` instead)                        |
| `SearchQueryError.outOfRange()`               | `paginatePageOrThrow()`/`paginateSliceOrThrow()` — requested page past the last available page |
| `SearchQueryError.invalidSearchTermsConfig()` | `parseSearchTerms()`/`parseSearchTermsString()` — invalid `SearchTermsConfig`                  |

Extended notes: **[docs/errors.md](docs/errors.md)**.

## Testing

```bash
npm run test:22        # docker compose run node22 — npm install + build + unit tests, no coverage
npm run test:24        # docker compose run node24 — npm install + build + unit tests, no coverage
npm run test:26        # docker compose run node26 — npm install + build + unit tests, no coverage
npm run test:all       # test:22 + test:24 + test:26
npm run test:coverage  # vitest run --coverage test/unit
npm run test:mutation  # stryker run — min MSI 100%
```

`npm install` is sufficient — no external services to start first.

## Development Helpers

```bash
npm run js:lint       # eslint (check only)
npm run js:lint:fix   # same, applies the fix
npm run js:format     # prettier --check .
npm run js:format:fix # same, applies the fix
npm run js:typecheck  # tsc --noEmit
```

## Architecture & Decisions

- **[docs/context.md](docs/context.md)** — current working state: what's in progress, what's next.
- **[docs/DECISIONS.md](docs/DECISIONS.md)** — why things are built the way they are, in the order the decisions were made.
- **[docs/CHANGELOG.md](docs/CHANGELOG.md)** — version history.

## License

[Unlicense](LICENSE) — public domain. Part of the [PimBay](https://pimbay.dev) ecosystem.

Bundled third-party dependencies and their licenses: **[docs/THIRD-PARTY-NOTICES.md](docs/THIRD-PARTY-NOTICES.md)**.
