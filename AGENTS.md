# Agent Guidance

This repository is a Tealstreet mirror. It is a filtered, read/write view of an
upstream monorepo. Contributors and agents work here normally through mirror
branches and pull requests; upstream monorepo access is not required.

This mirror is public open-source software under the MIT license. Do not add
terms that narrow the MIT grant or imply private/restricted access to the
tealchart mirror docs or license files.

## Before Editing

- Start from the latest mirror `master`.
- Use a feature branch for every change.
- Read the nearest relevant `CLAUDE.md` before changing package code.
- Keep edits scoped to the requested package or workflow.
- Do not commit directly to `master`.
- Do not add release or publish automation.

## Workflow

Prefer the repository `justfile`:

```bash
just start feat/my-change
just check
just pr
just done feat/my-change
```

Plain Git equivalent:

```bash
git switch master
git pull --ff-only origin master
git switch -c feat/my-change

yarn typecheck
yarn lint
yarn test

git push -u origin HEAD
gh pr create --fill

git switch master
git pull --ff-only origin master
git branch -d feat/my-change
```

If Git reports a conflict, stop and ask in the PR. Do not guess through merge
conflicts unless a maintainer asks you to resolve them.

## Quality Bar

- Run `just check` or the equivalent `yarn typecheck`, `yarn lint`, and
  `yarn test` before marking work ready.
- Let CI and maintainer review be the source of truth.
- Keep commits focused and easy to review.
- Update nearby docs when changing non-obvious behavior.

Merged mirror PRs sync upstream automatically. Do not attempt to access or
modify the upstream monorepo from this mirror.
