# AGENTS.md — search-query

## Project Overview

`@pimbay/search-query` is a framework-agnostic pagination and search-terms parsing library for TypeScript/JavaScript. It defines a small adapter interface (`pageView`/`pageSlice`/`pageAfter`/`count`/`ids`/`head`/`all`, whichever a given pagination style needs) and returns typed, immutable `Page`/`Slice`/`Cursor` result objects — no query-builder or ORM dependency of its own. Datasource-specific adapters (e.g. Drizzle) depend on this package, not the other way around; see `@pimbay/search-query-drizzle`.

License: Unlicense. Minimum Node version: 22.

## Commands

```bash
npm install
npm run js:build       # tsc -p tsconfig.build.json → dist/
npm run js:format      # prettier --check . — check only
npm run js:format:fix  # prettier --write .
npm run js:lint        # eslint src test — check only
npm run js:lint:fix    # eslint src test --fix
npm run js:typecheck   # tsc --noEmit
npm run test:22        # docker compose run node22
npm run test:24        # docker compose run node24
npm run test:26        # docker compose run node26
npm run test:all       # test:22 + test:24 + test:26
npm run test:coverage  # vitest run --coverage test/unit
npm run test:mutation  # stryker run — MSI 100 gate
```

`js:typecheck` is the authoritative type-safety gate — always run alongside `js:lint`/tests.
A bare command never mutates — only the `:fix` variant writes to disk.

## Code Style

- **Node 22+**, ESM only (`"type": "module"`), TypeScript `strict: true`.
- **ESLint** (`typescript-eslint` strict + stylistic type-checked) + **Prettier** — run `npm run js:lint:fix` / `js:format:fix`, don't hand-format.
- **Named exports only** — default exports are forbidden (enforced by lint rule).
- **`readonly` fields** by default on classes; prefer immutable result objects over mutation.
- **Named-constructor errors** — no inline `new SomeError(...)` beyond the trivial case; a `static <reason>(): self` per failure mode, private constructor.
- **One class/concept per file**, barrel-exported from `src/index.ts`.
- **Comments** only where non-obvious, always English. TSDoc only for shapes the compiler can't infer.
- **Markdown**: semantic linebreaks — break at sentence end, never inside a list item.
- **Docs discipline**: no "Project Layout" in READMEs — the tree speaks for itself.

## Architecture

### Core — always applies

```
src/
  index.ts        — barrel export, re-exports every public module. No logic of its own.
  errors.ts        — flat SearchQueryError with one static factory per failure mode.
```

Subdirectories beyond that are repo-specific, only where the domain has a real internal split.

- `page.ts` — `Page` result type, `PageAdapter` interface, `paginatePage`/`paginatePageOrThrow`.
- `slice.ts` — `Slice` result type, `SliceAdapter` interface, `paginateSlice`/`paginateSliceOrThrow`.
- `cursor.ts` — `Cursor` result type, `CursorAdapter` interface, `paginateCursor`.
- `searchterms.ts` — `parseSearchTerms`/`parseSearchTermsString`, `createSearchTermsConfig` — pure string parsing, no SQL/column awareness.
- `adapters.ts` — capability adapters shared across pagination styles (`CountableAdapter`, `HeadableAdapter`, `IdentifiableAdapter`, `AllAdapter`) and the `InMemoryArrayAdapter` reference implementation.

### Adapter/driver abstraction

Each pagination style is its own contract (`PageAdapter`, `SliceAdapter`, `CursorAdapter`) rather than one shared `Port` — the three styles need different data back from a datasource (a count, an over-fetched row, a cursor), so a single unified interface would force adapters to compute data they don't need. `InMemoryArrayAdapter` is the one reference implementation shipped here, implementing every adapter interface at once for tests and small, already-loaded collections; real datasource adapters (SQL, Drizzle, ...) live in their own packages, one per backend.

## Public library mode

Always applies — every repo here is published on npm. Every exported-symbol change is a public API decision.

- **Always ask before**: new runtime `dependencies` entry, changing a public signature, new architectural pattern, touching >1 package at once.
- **Never without instruction**: delete a public export, rename an exported symbol, break wire/schema compatibility, add a build-affecting dev dependency.
- Two valid approaches → present both, no silent pick.
- Multi-file change → list files, confirm scope, then proceed.

## Testing

- **Vitest**, `test/unit/` always.
- **`test/unit/`** — every collaborator faked, or none exists.
- **Coverage: 100%** — hard gate; a dropped coverage change comes with new tests, not an exclusion.
- **Mutation testing: Stryker, min MSI 100%** (`npm run test:mutation`) — an escaped mutant needs a stronger assertion, not a suppressed mutator.

## Guardrails

- No new runtime dependency without proposing it explicitly.
- Targeted diffs — don't rewrite a file for a small fix.
- No unrequested docs/test scaffolding.
- Don't introduce a DI container, config loader, or logging framework — flag the need, don't silently add.
- Domain-vocabulary vs local-shape placement unclear → ask, don't guess.
- New failure case → check for an existing error (named constructor) before adding one.
- No query-builder, ORM, or database-driver dependency — this package is deliberately framework/datasource-agnostic; datasource-specific adapters belong in their own package (see `CONTRIBUTING.md`'s Scope of changes).
- Changing or adding an adapter interface (`PageAdapter`/`SliceAdapter`/`CursorAdapter`/...) is a cross-package concern — it can break downstream adapter packages (e.g. `@pimbay/search-query-drizzle`) — flag it, don't change it silently.
