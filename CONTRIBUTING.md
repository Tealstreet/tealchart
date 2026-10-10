# Contributing

This is a mirror repository. Work here through normal pull requests; you do not
need access to the upstream Tealstreet monorepo.

## Quick Start

Clone the public mirror with file contents fetched on demand:

```bash
git clone --filter=blob:none --branch master https://github.com/Tealstreet/tealchart.git
cd tealchart
```

Keep the full commit graph for development; do not add `--depth`. Historical
checkouts, diffs and file reads may fetch old blobs and need network access
when they are not cached. Existing full clones retain their downloaded object
packs; changing a fetch filter does not reclaim that space.

Install the small workflow tools once:

```bash
brew install just gh
gh auth login
```

Start a branch from the latest `master`:

```bash
just start feat/my-change
```

Run checks before opening a PR:

```bash
yarn install
yarn workspace @tealstreet/tealscript oracle:fetch
just check
```

Push and open the PR:

```bash
just pr
```

After the PR is merged:

```bash
just done feat/my-change
```

## Plain Git Workflow

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

## Rules

- Do not commit directly to `master`.
- Do not add release or publish automation.
- If Git reports a conflict, stop and ask in the PR.
- Keep PRs focused. A maintainer reviews and merges accepted changes.
- Merged mirror PRs sync upstream automatically.

Native oracle tests require the pinned public fixtures. Run `yarn oracle:fetch`
from `packages/tealscript` before testing; see [ORACLE.md](packages/tealscript/ORACLE.md).
Capture requests and raw evidence belong in [tealscript-oracle](https://github.com/Tealstreet/tealscript-oracle).
