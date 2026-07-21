# Contributing to tealchart

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
yarn test          # vitest
yarn lint          # eslint
yarn typecheck     # web tsconfig
yarn typecheck:native  # native (React Native) tsconfig
yarn build-force   # tsup build (for releases)
```

## Scope

Tealchart is a focused charting widget + indicator system. PRs that
fit:

- Rendering / interaction fixes (canvas, Konva, Skia).
- Widget API surface — keep TradingView-compatible interfaces stable.
- Indicator system improvements that work for both built-in and
  user-authored indicators.
- Web + mobile parity — see "Feature Parity" below.
- Performance, accessibility, tests, docs.

Out of scope (open an issue first to discuss):

- Backend / networking changes — tealchart consumes a datafeed
  interface, not a specific exchange.
- Language / parser changes — those belong in
  [`@tealstreet/tealscript`](../tealscript).
- Trading or order-execution logic — tealchart exposes adapters
  (`IOrderLineAdapter`, `IPositionLineAdapter`); the consuming app
  implements the trading side.
- Hard dependencies on a specific UI framework, networking lib,
  storage backend, or React-Native–unfriendly browser API.

## Feature parity (critical)

Anything that affects the user-visible chart (rendering, interactions,
indicators, line types, gestures, persistence) **must be implemented
for both web and mobile in the same PR.**

The two platforms share:

- `core/ChartWidgetCore.ts` — bar fetching, indicator/pane lifecycle.
- `state/chartState.ts` — shared settings and atom factories.
- `utils/labelCollision.ts`, `interaction/InteractiveLineState.ts`,
  `viewport/ViewportController.ts` — shared algorithms.

Platform-specific rendering:

- **Web**: `ui/ChartCore.ts` (canvas + Konva), `interaction/EventManager.ts`.
- **Mobile**: `mobile/SkiaTealchart.tsx`, `mobile/components/*` (RN),
  `mobile/hooks/useChartGestures.ts`.

If a feature is genuinely web-only or mobile-only (e.g. keyboard
shortcuts, native haptics), say so explicitly in the PR description.

## TradingView interop

Tealchart's widget interfaces mirror TradingView's. Be careful to:

- Not copy any code or type definitions from TradingView's proprietary
  charting library. Re-declare the interfaces from scratch.
- Document any deliberate divergence from TradingView's behavior so
  consumers know what to expect when porting.

## Code style

Prettier + ESLint with the project defaults. Run `yarn lint` and
`yarn fix-all-files` before pushing.
