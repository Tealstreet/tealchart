# Consuming tealchart in another repo

tealchart isn't published to npm — consumers vendor it (git submodule) and link
the packages from source. The wiring has a few non-obvious steps; this is the
short version. (Reference consumers: `premys/apps/client`, `hyperprop/apps/hyperpaper-demo`.)

## 1. Vendor + link

Add this repo as a submodule and depend on both packages by path:

```jsonc
// package.json
"dependencies": {
  "@tealstreet/tealchart": "file:./vendor/tealchart/packages/tealchart",
  "@tealstreet/tealscript": "file:./vendor/tealchart/packages/tealscript"
}
```

`packages/tealchart` declares its `@tealstreet/tealscript` dependency as `"*"`,
which a package manager will try to fetch from the registry (it's private).
Force it to the vendored sibling:

- **yarn**: add a `resolutions` entry pointing `@tealstreet/tealscript` at the same `file:` path.
- **pnpm**: a `.pnpmfile.cjs` `readPackage` hook is the most reliable — rewrite
  tealchart's `@tealstreet/tealscript` dep to `file:../tealscript` before resolution.

## 2. Bundler

The packages ship **TypeScript source** as their entry (no build step), so the
consumer's bundler must transpile them. With Vite: exclude both from dependency
pre-bundling (so Vite handles their source) and dedupe `react`/`react-dom`.

## 3. Typechecker (optional but recommended)

Because the package `types` point at `.ts` source, a strict `tsc` will pull that
source into your program and may report errors from it. Either accept that, or
redirect type resolution (e.g. tsconfig `paths`) to a small local `.d.ts` shim
declaring just the surface you use — the bundler still resolves the real package.

## 4. Wire it up

```ts
import { createTealchartWidget } from "@tealstreet/tealchart";

const widget = createTealchartWidget({
  container,            // HTMLElement
  symbol: "BTC-USD",
  interval: "1",        // ResolutionString: "1","5","60","1D", …
  datafeed,             // your IBasicDataFeed (onReady/resolveSymbol/getBars/subscribeBars)
  theme: { name: "Dark", renderOptions: { upColor, downColor, backgroundColor, … } },
  autosize: true,
  showTopBar: true,
  createTealscriptWorker // optional — omit to drop indicator support
});
```

- **Data** comes through a TradingView-style `IBasicDataFeed` you implement
  against your own market source.
- **Indicators** need a TealScript worker. In bundlers where `new Worker(new URL(...))`
  is awkward, a main-thread stand-in works (TealScript is pure compute) — see the
  reference consumers.
- **Order/position overlays** use `widget.activeChart().createOrderLine()` /
  `createPositionLine()` (interactive, with cancel/close callbacks), not a generic
  price-line API.
