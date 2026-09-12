# TradingView ta Aroon Source Adjudication

Date: 2026-09-12  
Branch: `tealscript-runtime`  
Result: `TradingView/ta` Aroon uses the built-in endpoint calculation, implemented as a `length + 1` extrema-bars window with Pine's negative-or-zero `ta.highestbars()` / `ta.lowestbars()` offsets.

## Question

Two local `TradingView/ta` Aroon definitions disagreed:

- `src/officialTradingViewLibraries.ts` used `ta.highestbars(high, len + 1)` and `ta.lowestbars(low, len + 1)`.
- `src/officialTradingViewLibrarySources.ts` stored the v10 source with `ta.highestbars(high, length)` and `ta.lowestbars(low, length)`.

Both cannot be correct under Pine's negative-or-zero extrema-bars offset convention. With a `length` window, the oldest extremum can only be `-(length - 1)`, so `100 * (length + offset) / length` bottoms at `100 / length`. With a `length + 1` window, the oldest extremum can be `-length`, so the Aroon leg can reach `0`.

## Reference Evidence

- TradingView's public `ta` library page (`https://www.tradingview.com/script/BICzyhq0-ta/`) documents `aroon(length)` in the v3 section as the Aroon helper and its v4 release note says: `Updated aroon() calculation to match the built-in indicator values.`
- The same page identifies `length` as the Aroon lookback and returns a tuple of Aroon-Up and Aroon-Down values.
- Pine's `ta.highestbars()` and `ta.lowestbars()` return negative-or-zero offsets in TealScript's already-corrected documented vector family. The official-library Aroon formula is therefore only capable of matching the built-in indicator endpoint when it queries one extra bar and adds `length`.

## Red-First Reproduction

Added `execute.test.ts` coverage for a version-pinned `TradingView/ta/10` import:

```pine
//@version=6
indicator("official ta v10 aroon")
import TradingView/ta/10 as tvta
[up, down] = tvta.aroon(3)
plot(up, "Up")
plot(down, "Down")
```

Bars: monotonically rising high/low values from `makeBars([10, 11, 12, 13, 14])`.

Before the fix, `down` was:

```text
[null, null, 33.333333333333336, 33.333333333333336, 33.333333333333336]
```

The corrected endpoint calculation is:

```text
[null, null, null, 0, 0]
```

The red discriminates the two formulas directly: `length` cannot produce `0`; `length + 1` does.

## Fix

Updated `TRADINGVIEW_TA_V10_SOURCE` in `officialTradingViewLibrarySources.ts` so the stored source uses:

```pine
ta.highestbars(high, length + 1)
ta.lowestbars(low, length + 1)
```

This makes the stored source agree with the already-correct official-library shim and value-vector helper. The stale `length` source block was the wrong local artifact.

