# tealchart

A fast, lightweight charting library for trading UIs — web (Canvas) and React
Native (Skia). Ships with `tealscript`, its companion indicator/scripting
package.

> **This is a mirror.** It's a filtered, read/write view of an upstream
> monorepo. Contribute here normally (branch, PR, review); accepted changes are
> synced upstream. Everything needed to build and test lives in this repo — you
> don't need upstream access.

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

Branch off the default branch, open a PR; a maintainer reviews and merges.
Merged changes sync upstream and get a second review before landing in the
source of truth.

## License

MIT — see [`LICENSE`](LICENSE). **Scoped to this repository only** (see
[`NOTICE`](NOTICE)): the MIT grant covers `tealchart` and `tealscript` and
nothing else. It does not extend to any other Tealstreet software — notably
`tealstreet-sdk` (safe-cex, the CLI, and their dependencies), which is
proprietary and separately licensed — nor to the Tealstreet name, logos, or
trademarks.
