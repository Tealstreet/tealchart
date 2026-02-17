# packages/tealchart Agent Guide

## Scope

This file applies to work under `packages/tealchart`.

## Workspace Role

- Workspace package `@tealstreet/tealchart`.
- Main implementation is under `src/`.
- Referenced by 1 internal workspace.

## Commands (run from `packages/tealchart`)

- Dev (no-op placeholder): `yarn dev`
- Dev (force/watch): `yarn dev-force`
- Build (no-op placeholder): `yarn build`
- Build (force): `yarn build-force`
- Lint: `yarn lint`
- Lint autofix: `yarn fix-all-files`
- Typecheck: `yarn typecheck`
- Test: `yarn test`
- Unit tests: `yarn test-unit`
- Unit tests (watch): `yarn test-unit-watch`
- Clean: `yarn clean`

## Validation Baseline

Run: `yarn lint`, `yarn typecheck`, `yarn test-unit`.

## Notes

- `build`/`dev` are placeholder scripts in this workspace; use `build-force`/`dev-force` when you explicitly need a real tsup build/watch.
- Do not commit secrets or machine-local env files.
