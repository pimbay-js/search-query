# Contributing

Contributions are welcome — new datasource adapters, capability adapters, bug reports, documentation.

## Public Domain Dedication

By submitting a pull request, you dedicate your contribution to the public domain under the same [Unlicense](LICENSE) terms as this project.
You assert that you have the right to make this dedication.

## Guidelines

- Node 22+, ESM only, TypeScript `strict: true`
- ESLint (`typescript-eslint` strict + stylistic type-checked) clean, no errors
- 100% code coverage required
- 100% mutation score required (`npm run test:mutation`, Stryker — min MSI 100%); an escaped mutant means the test needs a stronger assertion, not a suppressed mutator

## Before opening a PR

All of the following must pass locally:

```bash
npm run js:build
npm run js:lint
npm run js:format
npm run js:typecheck
npm run test:coverage
npm run test:mutation
```
