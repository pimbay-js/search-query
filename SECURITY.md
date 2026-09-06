# Security Policy

## Reporting a vulnerability

Report suspected security vulnerabilities privately — do not open a public issue for them.

Use [GitHub Security Advisories](https://github.com/pimbay-js/search-query/security/advisories/new) for this repository, or email **security@pimbay.dev**.

Include what you'd include in any bug report: affected version/commit, reproduction steps, and impact as you understand it.
A proof-of-concept is helpful but not required to file a report.

## What to expect

- Acknowledgement within 5 business days.
- An initial assessment (confirmed / not applicable / needs more information) within 10 business days of acknowledgement.
- Credit in the fix's changelog entry, unless you ask to stay anonymous.

There is no bug bounty program.

## Scope

In scope: this repository's own code (`src`) and its Actions workflows.
This package has zero runtime dependencies, so the practical attack surface is narrow — malformed adapter output being trusted incorrectly, or a pagination/cursor edge case producing an out-of-bounds read, are the kinds of issues most likely to matter here.

Out of scope: vulnerabilities in devDependencies with no `search-query`-specific exploitation path (nothing here ships to consumers — only `dist/` is published) — report those upstream instead.
If you're unsure whether something is in scope, report it anyway and let us triage it.

## Supported versions

Only the latest published version receives security fixes.
This project does not currently maintain long-term-support branches.
