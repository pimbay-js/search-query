# Decisions

> Append-only log of decisions specific to _this_ project.
> Never edit or delete a past entry — if a decision changes, add a new entry that supersedes it and says so.
>
> **What belongs here** (test): would changing this silently break correctness, compatibility, or behavior if someone didn't know why it was done this way?
> If yes → here.
> If it's a cheap/local implementation detail → docs/context.md instead.
> If it's a pattern repeated across multiple repos → AGENTS.md instead, not here.

## `paginatePageOrThrow`/`paginateSliceOrThrow` throw instead of returning a checkable result

**Date:** 2026-09-01

**Decision:** `paginatePageOrThrow` and `paginateSliceOrThrow` were added as thin wrappers around `paginatePage`/`paginateSlice` that call `isOutOfRange()` for the caller and throw `SearchQueryError.outOfRange()` instead of returning a result the caller has to check.

**Why:** Most callers treat an out-of-range page as a hard error (a malformed request, a stale link), not a state to render — the plain `paginatePage`/`paginateSlice` forcing every caller to call `isOutOfRange()` themselves is boilerplate most callers don't want.
`paginateCursor` has no equivalent — cursor pagination has no "out of range" concept, so there is no `paginateCursorOrThrow`.

## `likeChar`/`ignoreChar` became `likeMarkers`/`ignoreMarkers` arrays, and `-`/`!` both negate by default

**Date:** 2026-09-27

**Decision:** `SearchTermsConfig` carries `likeMarkers: readonly string[]` (default `['*']`) and `ignoreMarkers: readonly string[]` (default `['-', '!']`) in place of the single-string `likeChar`/`ignoreChar`.
The names say `Markers`, not `Chars`, because an entry is a string of any length, not a single character — which the old names already misrepresented.
Every entry of `likeMarkers` is an alias for the same wildcard; every entry of `ignoreMarkers` is an alias for negation.
Both may be `[]`, which disables that marker class entirely.
`createSearchTermsConfig` normalizes each set longest-first and rejects an empty entry, a duplicate within a set, and an entry shared between the two sets.

**Why:** `-` is the negation convention users bring from web search, `!` the one they bring from Lucene and Elasticsearch `query_string`.
Supporting one meant the other silently searched for a literal.
A caller could already switch the marker, but not accept both.

`[]` is allowed because every marker removes a literal from the searchable space, and the parser has no quoting syntax to get it back: with negation on, a term can never begin with `-` or `!`, so data like `-5 rabat` or `!important` needs a way to turn negation off.
The same holds for `likeMarkers`.

Longest-first normalization matters when one marker is a prefix of another (`-` alongside `--`): without it, which one matched would depend on the order the caller happened to pass them in.

**Consequence:** breaking change for anyone setting `likeChar`/`ignoreChar` on `createSearchTermsConfig`.
Nothing outside `parseSearchTerms` reads either field, so a datasource adapter package only needs to change where it turns a like marker into an SQL wildcard.

**Alternatives considered:** Keeping single strings and adding quoting (`"-5"`) so a leading marker could be escaped.
Rejected for now — `parseSearchTermsString` splits on whitespace only, so quoting is a parser feature of its own, not a config tweak.
`[]` covers the same need for the field-level case this library actually serves.
