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
