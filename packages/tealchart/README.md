# @tealstreet/tealchart

Canvas-based OHLCV chart widget with a TradingView-compatible widget
API, an interactive line overlay (Konva on web, Skia on mobile), and a
companion DSL ([`@tealstreet/tealscript`](https://github.com/Tealstreet/tealchart/tree/main/packages/tealscript))
for built-in and user-authored indicators.

> Tealchart's widget API mimics the _shape_ of TradingView's charting
> library so that integrations can target the same surface, but it
> ships no code from TradingView and is not affiliated with or
> endorsed by TradingView, Inc.

## What it is

- **Hybrid renderer.** Candlesticks, volume, grid, axes, and crosshair
  are drawn directly to a 2D canvas for high-frequency updates.
  Interactive elements (order/position lines, draggable labels,
  context menus) sit on top via Konva (web) or Skia (mobile).
- **TradingView-compatible widget API.** Implements
  `IChartingLibraryWidget`, `IChartWidgetApi`, `IOrderLineAdapter`,
  and `IPositionLineAdapter` interfaces, plus a bidirectional layout
  transformer so charts can serialize to and from TradingView's JSON
  format.
- **Web + React Native parity.** Shared core (`ChartWidgetCore`,
  shared state, viewport controller, label collision) with two
  rendering layers — DOM/canvas/Konva on web,
  `@shopify/react-native-skia` on mobile.
- **Indicator system.** Built-in indicators (SMA, EMA, RSI, MACD,
  Bollinger Bands, etc.) defined via `@tealstreet/tealscript`. User
  indicators authored in the same DSL run in a Web Worker so the UI
  thread stays free.
- **Per-chart persistence.** Jotai `atomWithStorage` with schema
  versioning and a `safeDeepMerge` recovery path for corrupted
  localStorage.

## Status

Pre-1.0. Both packages ship as part of the Tealstreet web and mobile
clients; APIs may move without notice until 1.0.

## Install

These packages are distributed as **source** (not published to npm). Vendor
them from the tealchart source mirror — e.g. as a git submodule — and let your
bundler transpile the TypeScript (Next.js: add them to `transpilePackages`;
Metro / React Native: handled automatically).

`react` 18 or 19 is a peer dependency. Tealchart relies on `konva`,
`jotai`, `jotai-optics`, `nanostores`, and the FontAwesome runtime —
see `package.json` for exact versions.

## Quick start

```tsx
import { createTealchartWidget } from '@tealstreet/tealchart';

const widget = createTealchartWidget({
  container: document.getElementById('chart')!,
  symbol: 'BTCUSDT',
  interval: '1h',
  datafeed: yourDatafeed, // implements TradingView-style datafeed API
});

widget.onChartReady(() => {
  const chart = widget.activeChart();
  chart.createStudy('RSI', false, false, { length: 14 });
});
```

See `src/TealchartWidget.ts` for the full widget surface.

## Architecture (briefly)

```text
src/
├─ TealchartWidget.ts        # entry: createTealchartWidget()
├─ TealchartApi.ts           # per-chart API
├─ TealchartRenderer.ts      # pure-canvas drawing (~1500 LOC)
├─ core/ChartWidgetCore.ts   # shared web+mobile core
├─ rendering/                # PaneManager + canvas adapters
├─ ui/                       # plain-JS/DOM UI layer (not React)
├─ react/                    # thin React wrapper
├─ mobile/                   # React Native + Skia implementation
├─ state/                    # Jotai atoms + persistence
├─ indicators/               # built-in indicator registry
├─ tealscript/               # worker bridge for indicator execution
└─ transformer/              # TradingView layout JSON interop
```

The renderer is pure canvas with no React state — testable
independently of any framework.

## Trade lines: identity and the host contract

`createOrderLine()` returns an **adapter**, and that adapter *is* the line's
identity for as long as it exists. Tealchart never infers which order a line
represents — the venue's `orderId` is payload you attach, not a name the chart
answers to. This mirrors TradingView, whose line adapter carries no order
identity at all.

Two rules follow, and dragging misbehaves if you break either.

**Keep the adapter alive across an amend.** On most venues an amend is a cancel
followed by a place, so the order comes back under a *different* id. Re-point the
adapter you already have rather than removing it and creating another. Removing
an adapter tells the chart the line is gone, and it will believe you — including
in the middle of a drag the user has not finished.

**Register callbacks once.** Bind them as closures that read your current line at
call time:

```ts
adapter.onMove((nextPrice) => entry.line.onMove?.(nextPrice, entry.line.price));
adapter.onCancel(() => entry.line.onCancel?.());
```

Re-registering per update forces you to rebuild the adapter whenever a handler
appears or disappears, which throws away the identity of an order that never
moved.

An optimistic order store is **not** required. While a drag is in flight the
chart draws the price the user dragged to, and confirms against what comes back
with a tick of slack for venue rounding. A host that has such a store is not
penalised for it either.

## Mobile

```tsx
import { SkiaTealchart } from '@tealstreet/tealchart/native';
```

The mobile entry uses `@shopify/react-native-skia` for hardware-
accelerated rendering. See `src/mobile/` for the RN-specific code and
gesture handling.

## Tealscript integration

Indicators are written in tealscript, a PineScript-inspired DSL. A
factory function `createTealscriptWorker()` is required from the
consuming app (the chart needs to know how to spawn a Web Worker for
your bundler/runtime). See
[`@tealstreet/tealscript`](https://github.com/Tealstreet/tealchart/tree/main/packages/tealscript)
for the language reference.

## License

MIT — see [LICENSE](./LICENSE).

## Contributing

See the umbrella [CONTRIBUTING.md](../../CONTRIBUTING.md). All commits
are DCO-signed (`git commit -s`).
