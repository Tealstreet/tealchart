# Contributing to tealscript

Thanks for your interest. A few ground rules.

## Sign-off (DCO)

This project uses the [Developer Certificate of
Origin](https://developercertificate.org/) rather than a CLA. Every
commit must be signed off with:

```bash
git commit -s -m "your message"
```

…which appends a `Signed-off-by: Your Name <you@example.com>` line.
By signing off you certify that you have the right to submit the work
under the project's MIT license.

## Development

```bash
yarn install
yarn test          # run tests
yarn lint          # lint
yarn typecheck     # type-check
yarn build:parser  # regenerate parser when grammar.peggy changes
```

Always commit `src/parser/generated.js` and
`src/parser/generated.d.ts` together with `grammar.peggy` changes.

## Scope

Tealscript is a focused indicator-scripting language. PRs that fit:

- Grammar / parser fixes and small subset additions.
- Runtime built-in functions (`ta.*`, `math.*`, etc.) — keep behavior
  documentable and side-effect-free.
- Semantic analyzer additions — typed diagnostics, completion data,
  hover info.
- Worker-harness improvements.
- Tests, docs, performance.

Out of scope (open an issue first to discuss):

- Charting / UI changes — those belong in
  [`@tealstreet/tealchart`](https://github.com/Tealstreet/tealchart).
- Direct dependencies on UI frameworks, networking libraries, or
  storage backends.
- Behavior changes that break the existing test suite.

## Issues

When filing a parser or runtime bug, please include:

1. A minimal tealscript source that reproduces the issue.
2. The actual output (or error message + location).
3. The expected output.

## Code style

We use Prettier + ESLint with the project defaults. Run `yarn lint` and
`yarn format` before pushing.
