# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/).

## [Unreleased]

### Added

- `SearchTermsConfig.ignoredTermsMatchNull` (default `true`) — a pass-through hint, like `anywhere`, telling a datasource package whether a negated term should also keep records with no value. It exists because `value != 'red'` drops every `NULL` row under SQL's three-valued logic, so `-red` silently excluded records that had nothing to compare; the adapters read this flag to decide. The default is the reading a person typing `-red` expects, so behaviour changes for adapters that adopt it.

## [2.0.0] - 2026-09-27

### Added

- `SearchTermsConfig` accepts several negation markers and several wildcard markers at once, every one of them an alias for the same behaviour; `!` negates a term alongside `-` out of the box.
- Either marker set may be left empty, which turns that marker class off entirely — the way to search data that legitimately starts with `-` or `!`, or contains `*`.

### Changed

- **BC break:** `SearchTermsConfig.likeChar` and `SearchTermsConfig.ignoreChar` became `likeMarkers` and `ignoreMarkers`, each a string array rather than a single string.
- A marker that is a prefix of another one (`-` alongside `--`) no longer shadows it depending on the order the two were passed in — the longer marker always wins.
- `createSearchTermsConfig` additionally rejects a marker repeated within a set, and a marker shared between the two sets.

## [1.0.0] - 2026-09-06

### Added

- `Page`/`paginatePage`, `Slice`/`paginateSlice`, `Cursor`/`paginateCursor` and their adapter interfaces.
- `InMemoryArrayAdapter` reference adapter.
- `parseSearchTerms`/`parseSearchTermsString` and `createSearchTermsConfig`.
