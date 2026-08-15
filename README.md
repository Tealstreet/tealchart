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

If this checkout is vendored into a React Native app, `yarn install` here can
break that app — see [Vendoring tealchart as source](#vendoring-tealchart-as-source).

## Using tealchart

```ts
// Web
import { createTealchartWidget } from '@tealstreet/tealchart';

// React Native (requires @shopify/react-native-skia + peers)
import { SkiaTealchart } from '@tealstreet/tealchart/native';
```

### Vendoring tealchart as source

tealchart is not published as a built package yet, so React Native apps consume
it as source — usually a submodule at `vendor/tealchart` with Metro aliases
pointing at `packages/tealchart/src`. That puts tealchart's files **outside** the
app's `node_modules`, and Metro resolves a bare import by walking up from the
importing file's directory. `vendor/tealchart/node_modules` therefore wins over
the app's copy.

That matters because `yarn install` in this repo — which you need for
`yarn typecheck`, `yarn lint`, and `yarn test` above — installs tealchart's own
`react`, `react-native`, `react-native-reanimated`, `react-native-worklets`, and
`react-native-gesture-handler`. The consuming app then loads a **second copy** of
packages that must be singletons, bound to native code that only ever registered
the first.

A duplicate `react-native-worklets` is the dangerous one: it creates a second
worklet runtime, which corrupts the Hermes heap. The app dies with
`EXC_BAD_ACCESS` in `hermes::vm::*` at a different address and a different call
site on every launch, with no JavaScript error and nothing pointing at module
resolution. A duplicate `react-native-reanimated` is milder and usually surfaces
as `"react-native-reanimated is not installed!"`.

Guard against it in the consuming app's `metro.config.js` by resolving bare
specifiers from the vendor tree as if they were required from the app root:

```js
const vendorRoot = path.join(__dirname, 'vendor/tealchart');
const appRootOrigin = path.join(__dirname, 'package.json');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    context.originModulePath?.startsWith(vendorRoot) &&
    !moduleName.startsWith('.') &&
    !path.isAbsolute(moduleName)
  ) {
    try {
      return context.resolveRequest(
        { ...context, originModulePath: appRootOrigin },
        moduleName,
        platform,
      );
    } catch {
      // Vendor-only dependency: fall through to default resolution.
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};
```

Deleting `vendor/tealchart/node_modules` also fixes it, but only until the next
time someone runs the checks in this repo. Prefer the resolver guard.

This section becomes unnecessary once tealchart ships as a built package.

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
