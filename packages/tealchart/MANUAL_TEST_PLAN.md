# Tealchart Manual Test Plan

Mirrors the programmatic test plan (`npx vitest run` — 250 tests). Each section maps to the corresponding test file.

**Prerequisites:**

- Dev server running on `localhost:3001` from the tealscript worktree
- At least one connected exchange account
- Browser DevTools open (Console tab for errors, Network tab optional)

---

## Phase 1: Utility Behavior (Observable Through UI)

### 1A. EventEmitter — `EventEmitter.test.ts`

Events are internal plumbing. Verify they work by observing that callbacks fire correctly.

| #   | Test               | Steps                                                                                                                    | Expected                                                           |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 1   | Widget events fire | Open chart. Open DevTools Console. Type `window.__tealchart_debug = true` if debug hooks exist. Click on chart, release. | No errors in console. Mouse down/up events handled cleanly.        |
| 2   | Multiple listeners | Subscribe to the same chart from two panels (if multi-chart layout available). Change symbol on one.                     | Both panels receive their own events independently. No cross-talk. |
| 3   | Error isolation    | Open Console. If any plugin/indicator throws, other indicators should still render.                                      | One broken indicator doesn't crash the whole chart.                |

### 1B. Label Collision — `labelCollision.test.ts`

| #   | Test                          | Steps                                                                          | Expected                                                                              |
| --- | ----------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 1   | No overlap with spread orders | Place 3 limit orders at prices far apart (e.g., +5%, +10%, +15% from current). | Each order label renders at its natural position, no stacking.                        |
| 2   | Overlapping orders stack      | Place 3 limit orders within 0.1% of each other.                                | Labels stack vertically — no text overlaps. All 3 labels visible.                     |
| 3   | Priority anchoring            | Place a limit order near the current position entry price.                     | Position label (higher priority) stays in place. Order label shifts to avoid overlap. |
| 4   | Crosshair near labels         | Move crosshair to a price level where order/position labels exist.             | Crosshair price label doesn't overlap with order labels. Labels push apart.           |
| 5   | Many labels cluster           | Place 5+ orders at very close prices. Zoom into that region.                   | All labels visible, stacked without gaps between them. No label disappears.           |

### 1C. Safe Deep Merge — `safeDeepMerge.test.ts`

| #   | Test                            | Steps                                                                                                                            | Expected                                                              |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | Corrupted localStorage recovery | Open DevTools → Application → Local Storage. Find tealchart settings key. Edit a value to `"undefined"` or `"NaN"`. Reload page. | Chart loads with defaults for the corrupted field. No crash.          |
| 2   | Missing fields filled           | Delete some keys from the tealchart settings in localStorage (e.g., remove `showVolume`). Reload.                                | Missing fields use defaults. Volume overlay appears (default = true). |
| 3   | Empty localStorage              | Delete the entire tealchart settings key from localStorage. Reload.                                                              | Chart loads with full default settings. No errors.                    |
| 4   | Partial nested object           | Edit localStorage to have `{"nested": {}}` with missing sub-fields. Reload.                                                      | Sub-fields filled from defaults.                                      |

### 1D. Pane Manager — `PaneManager.test.ts`

| #   | Test                            | Steps                                                                        | Expected                                                                                   |
| --- | ------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Initial state: main pane only   | Load chart with no indicators.                                               | Single main chart pane occupies full height (minus time axis).                             |
| 2   | Add overlay indicator           | Click Indicators → add SMA or EMA.                                           | SMA renders ON the main pane. No new pane created. Main pane height unchanged.             |
| 3   | Add non-overlay indicator       | Click Indicators → add RSI.                                                  | New pane appears below main chart. Main pane shrinks. RSI has its own Y-axis (0-100).      |
| 4   | Add second non-overlay          | Add MACD after RSI.                                                          | Third pane appears. Main pane shrinks further but stays at least 40% of height.            |
| 5   | Same-range panes share          | Add two indicators with same Y range (e.g., two RSI instances if supported). | They share the same pane.                                                                  |
| 6   | Remove indicator restores space | Remove RSI via legend trash icon.                                            | RSI pane disappears. Main pane grows. If all indicators removed, main pane = 100%.         |
| 7   | Pane divider drag               | Drag the divider between main and indicator pane up/down.                    | Pane heights adjust smoothly. Both panes render correctly.                                 |
| 8   | Min main pane height            | Add many non-overlay indicators (4+).                                        | Main pane never shrinks below ~40% of chart height. Indicator panes share remaining space. |

---

## Phase 2: Widget Correctness

### 2A. Symbol Switching — `TealchartWidget.test.ts`

| #   | Test                        | Steps                                                                                                             | Expected                                                                                                  |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Basic symbol switch         | Click symbol in header → search for different symbol (e.g., ETHUSDT) → select it.                                 | Chart clears, shows loading briefly, then renders new symbol's candles. Price axis shows new price range. |
| 2   | Verify data matches         | After switching to ETHUSDT, compare a candle's OHLC (visible in legend on hover) with the exchange's actual data. | Prices match the exchange.                                                                                |
| 3   | Old subscription cleaned up | Switch from BTCUSDT to ETHUSDT. Wait 30s.                                                                         | No BTC candles appear on the ETH chart. Real-time updates are for ETH only.                               |
| 4   | Same symbol is no-op        | Click the symbol selector and re-select the current symbol.                                                       | Nothing happens. No loading state. No flicker.                                                            |
| 5   | Rapid switching             | Click symbol selector, quickly switch A → B → C (3 symbols in <2 seconds).                                        | Only the final symbol's data loads. No stale data from A or B appears.                                    |
| 6   | Symbol reflected in UI      | After switching to SOLUSDT.                                                                                       | Header shows "SOLUSDT". Legend shows SOL prices.                                                          |

### 2B. Interval Switching — `TealchartWidget.test.ts`

| #   | Test                       | Steps                                              | Expected                                                                             |
| --- | -------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | Basic interval switch      | Click "5m" in the timeframe bar.                   | Chart clears, shows loading, then renders 5-minute candles. Time axis labels update. |
| 2   | Loading state visible      | Switch from 1h to 1D. Watch for loading indicator. | Brief loading state shown before new candles appear.                                 |
| 3   | Same interval is no-op     | Click the already-active timeframe button.         | Nothing happens. No reload. Button stays highlighted.                                |
| 4   | Rapid switching            | Click 1m → 5m → 15m → 1h quickly.                  | Only 1h data loads. No flickering between timeframes.                                |
| 5   | Candle count reasonable    | Switch to 1m, then to 1D.                          | 1m shows many thin candles. 1D shows fewer wide candles. Both fill the viewport.     |
| 6   | Real-time updates continue | Switch to 1m. Wait for a new candle to form.       | New candle appears at the right edge. Last candle updates in real-time.              |

### 2C. Multi-Widget Independence — `TealchartWidget.test.ts`

| #   | Test                         | Steps                                                                        | Expected                                                            |
| --- | ---------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Two charts different symbols | Open a layout with 2 chart panels. Set chart A = BTCUSDT, chart B = ETHUSDT. | Each chart shows its own symbol. Different price ranges.            |
| 2   | Change A, B unaffected       | Change chart A to SOLUSDT.                                                   | Chart B still shows ETHUSDT. No disruption.                         |
| 3   | Independent intervals        | Set chart A to 1h, chart B to 5m.                                            | Each chart shows its own timeframe independently.                   |
| 4   | Independent real-time        | Wait for real-time updates on both charts.                                   | Each chart receives its own symbol's ticks. No cross-contamination. |
| 5   | Close one, other survives    | Close chart A's panel.                                                       | Chart B continues updating. No errors.                              |

### 2D. Viewport Reset Bug — `TealchartWidget.test.ts`

| #   | Test                           | Steps                                                                                        | Expected (current)                                                                               | Expected (after fix)                                      |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 1   | Viewport after symbol switch   | View BTCUSDT (~$95k). Switch to DOGEUSDT (~$0.25).                                           | **BUG**: Chart may show DOGE candles but Y-axis still shows BTC's price range until interaction. | Chart auto-fits to DOGE's price range immediately.        |
| 2   | Viewport after interval switch | Zoom into a small region on 1h. Switch to 1D.                                                | **BUG**: Old zoom level may persist, showing too few or too many candles.                        | Chart auto-fits to show ~100 candles at the new interval. |
| 3   | Reset viewport button          | After any viewport issue, click the reset viewport button (bottom-center, appears on hover). | Viewport recalculates and fits all visible bars correctly.                                       |
| 4   | Pan after switch               | Switch symbols, then try to pan left.                                                        | Historical data loads for the NEW symbol, not the old one.                                       |

---

## Phase 3: Integration

### 3A. Coordinate Accuracy — `TealchartRenderer.test.ts`

| #   | Test                           | Steps                                                                                      | Expected                                                                 |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 1   | Crosshair price matches candle | Hover crosshair exactly on a candle's high wick tip. Read the price from the Y-axis label. | Price label matches the candle's high price shown in the OHLC legend.    |
| 2   | Crosshair time matches candle  | Hover crosshair on a candle body. Read the time from the X-axis label.                     | Time label matches the candle's timestamp.                               |
| 3   | Price at top of chart          | Move crosshair to the very top of the chart area.                                          | Price label shows a value >= the highest visible candle's high.          |
| 4   | Price at bottom of chart       | Move crosshair to the very bottom of the chart area.                                       | Price label shows a value <= the lowest visible candle's low.            |
| 5   | Order line at correct Y        | Place a limit order at a specific price. Observe the line on the chart.                    | Line is drawn at the exact Y position matching that price on the Y-axis. |
| 6   | Indicator pane coordinates     | Add RSI indicator. Hover crosshair in the RSI pane.                                        | RSI value shown (0-100 range). Value matches the RSI line position.      |
| 7   | Zoom doesn't break coordinates | Zoom in tightly on a few candles. Hover crosshair.                                         | Price/time labels remain accurate at the zoomed scale.                   |
| 8   | Pan doesn't break coordinates  | Pan far left into history. Hover crosshair.                                                | Price/time labels remain accurate for historical candles.                |

### 3B. Layout Save/Load Round-Trip — `roundTrip.test.ts`

| #   | Test                                 | Steps                                                                                       | Expected                                                               |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Save and reload preserves symbol     | Set symbol to ETHUSDT. Save layout as "Test Layout". Change to BTCUSDT. Load "Test Layout". | Symbol returns to ETHUSDT.                                             |
| 2   | Save and reload preserves interval   | Set interval to 15m. Save layout. Change to 1h. Load layout.                                | Interval returns to 15m.                                               |
| 3   | Save and reload preserves indicators | Add SMA(20) and RSI(14). Save layout. Remove all indicators. Load layout.                   | SMA and RSI reappear with correct parameters.                          |
| 4   | Save and reload preserves volume     | Toggle volume off. Save layout. Toggle volume on. Load layout.                              | Volume is off after loading.                                           |
| 5   | Save and reload preserves chart type | Switch to line chart. Save. Switch to candle. Load.                                         | Chart type returns to line.                                            |
| 6   | Dirty indicator after changes        | Load a saved layout. Change the interval.                                                   | Unsaved changes indicator (yellow dot) appears in the layout selector. |
| 7   | Auto-save (if configured)            | Load a layout. Make a change. Wait for auto-save delay.                                     | Save status briefly shows spinner then checkmark. Changes persisted.   |

---

## Quick Smoke Test Checklist

For a fast pass (5 minutes), hit these critical paths:

- [ ] Chart loads with candles and real-time updates
- [ ] Switch symbol — new data loads, old data gone
- [ ] Switch interval — new candles load at correct timeframe
- [ ] Add RSI indicator — new pane appears below main chart
- [ ] Remove RSI — pane disappears, main chart grows back
- [ ] Hover crosshair — price/time labels track mouse accurately
- [ ] Place limit order — order line renders at correct price
- [ ] Pan left — historical data loads seamlessly
- [ ] Zoom in/out — candles resize, axis labels update
- [ ] No console errors throughout
