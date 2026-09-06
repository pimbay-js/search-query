# Context

> Working memory, not a historical record.
> Continuously edited, not append-only — unlike DECISIONS.md.
> When something here resolves: delete it if it was only ever local/temporary, or promote it to DECISIONS.md if it turned out to matter beyond this moment.
> Don't let resolved items pile up here.

## Current focus

Ongoing work is reconciling the two so the JS port mirrors the PHP library's public surface and behavior.

## Open questions

- None open right now.

## Known limitations / non-goals (for now)

- No bundled datasource adapters beyond `InMemoryArrayAdapter` — datasource-specific adapters (e.g. Drizzle) ship as separate packages, not here.

## Implementation notes

- Node CI matrix is 22/24/26; Node 22 is the baseline version that alone runs lint/format/audit/coverage/mutation.

## Ideas / future plans

- None currently — nothing here is a commitment.
