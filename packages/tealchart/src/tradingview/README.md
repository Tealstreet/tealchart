# Tealchart TradingView Adapter

This optional entry point lets an application render TradingView Advanced Charts
as the base chart layer while Tealchart renders jailbreak indicators and trading
overlays from patched candle-render callbacks.

Tealchart does not vendor or redistribute TradingView assets. The host
application must provide its own licensed `charting_library` files.

## Supported Baseline

- TradingView Advanced Charts: `v31.2.0`
- Git commit: `ace24b13d3763d233bbbe21883e79017a02b0a1f`
- Main bundle observed in that release:
  `charting_library/bundles/library.f615dbeaa9fac48853ce.js`
- SHA-256 for that bundle:
  `7bd8cc4abf3951eed93d7ca3ff484ec27889fdc63687eff0fdd0dbee08d7dbf1`

The adapter is version and hash aware, but it intentionally accepts a
caller-supplied `TradingViewPatchSpec`. That keeps TradingView source out of
Tealchart and lets installers update their patch anchors alongside the exact
bundle they ship.

## Runtime Flow

1. Install TradingView script interception before loading `charting_library.js`.
2. Match the real minified bundle URL, usually `/bundles/library.*.js`.
3. Fetch the bundle, verify the expected hash, apply exact text patches, and
   inject the patched code as a blob script.
4. Install Tealchart callbacks on `window` and `window.top`.
5. Construct the TradingView widget normally.
6. The patched candle renderer calls Tealchart before and after native candles.
7. `TradingViewOverlayBridge` normalizes the raw frame and delegates to
   `JailbreakIndicatorManager`.

## Sketch

```ts
import {
  createTradingViewWidgetAdapter,
  installTradingViewScriptPatchInterceptor,
  TradingViewOverlayBridge,
  type TradingViewPatchSpec,
} from '@tealstreet/tealchart/tradingview';

const spec: TradingViewPatchSpec = {
  id: 'tv-31.2.0-library-f615dbe',
  tradingViewVersion: '31.2.0',
  sourceSha256: '7bd8cc4abf3951eed93d7ca3ff484ec27889fdc63687eff0fdd0dbee08d7dbf1',
  patches: [
    // Installer-owned anchors for the exact bundle being shipped.
  ],
};

const interceptor = installTradingViewScriptPatchInterceptor({
  rules: [{ matches: '/bundles/library.', spec }],
});

const overlay = new TradingViewOverlayBridge({
  indicators: [
    {
      id: 'example',
      indicator: makeIndicator(),
      settings: {},
      behindCandles: false,
    },
  ],
});

const adapter = createTradingViewWidgetAdapter({
  widget: window.TradingView.widget,
  widgetOptions,
  hooks: overlay.callbacks(),
});

// Later:
adapter.dispose();
interceptor.dispose();
```

## Patch Contract

Required patches should fail closed:

- attach raw bars and coordinate bars to the candle renderer data
- expose `priceToCoord` and `coordToPrice` from the active price scale
- call `beforeBars(frame)` before native candle draw
- call `shouldSkipNativeBars(frame)` around native candle draw
- call `afterBars(frame)` after native candle draw

The frame should match `TradingViewRawRenderFrame`; `frameBridge.ts` converts it
to Tealchart's existing `IndicatorDrawArgs`.
