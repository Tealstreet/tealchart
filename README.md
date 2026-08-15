# tealchart

A fast, lightweight charting library for trading UIs — web (Canvas) and React
Native (Skia). Ships with `tealscript`, its companion indicator/scripting
package.

> **This is a mirror.** It's a filtered, read/write view of an upstream
> monorepo. Contribute here normally (branch, PR, review); accepted changes are
> synced upstream. Everything needed to build and test lives in this repo — you
> don't need upstream access.

For contributor workflow details, see [`CONTRIBUTING.md`](CONTRIBUTING.md). For
coding agents and LLM tools, see [`AGENTS.md`](AGENTS.md).

## Packages

```text
packages/tealchart    Charting library (web + React Native Skia)
packages/tealscript   Indicator / scripting engine used by tealchart
```

## Develop

```bash
yarn install
yarn typecheck
yarn lint
yarn test
```

## Using tealchart

```ts
// Web
import { createTealchartWidget } from '@tealstreet/tealchart';

// React Native (requires @shopify/react-native-skia + peers)
import { SkiaTealchart } from '@tealstreet/tealchart/native';
```

## Contributing

Branch off `master`, open a PR, and wait for a maintainer to review and merge.
Merged changes sync upstream automatically; you do not need upstream access.

If Git reports a conflict, stop and ask in the PR. Do not commit directly to
`master`.

### Simple workflow with `just`

Install [`just`](https://github.com/casey/just) and the GitHub CLI once:

```bash
brew install just gh
gh auth login
```

Start from the newest mirror `master` and create a feature branch:

```bash
just start feat/my-change
```

Do your work, then run the normal checks:

```bash
just check
```

Push and open a PR:

```bash
just pr
```

After the PR is merged, return to a clean `master`:

```bash
just done feat/my-change
```

### Same workflow with plain Git

Start from the newest mirror `master`:

```bash
git switch master
git pull --ff-only origin master
git switch -c feat/my-change
```

Push and open a PR:

```bash
git push -u origin HEAD
gh pr create --fill
```

After the PR is merged:

```bash
git switch master
git pull --ff-only origin master
git branch -d feat/my-change
```

## License

MIT — see [`LICENSE`](LICENSE).
