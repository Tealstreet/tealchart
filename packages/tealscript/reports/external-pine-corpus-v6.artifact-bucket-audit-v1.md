> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v6 Artifact Bucket Audit v1

Date: 2026-09-11

This is a skeptical second pass over the 60 rows classified as
corpus/chart/output artifacts in
`external-pine-corpus-v6.dispatch-routing-audit-v1.md`.

Basis:

- Corpus: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911`
- Rerun result:
  `/tmp/external-pine-corpus-v6-dispatch-168-current-head.json`
- Measured commit:
  `bf15e19ca160f4db877ff1e63ba1316bfe8a6875`

## Result

| Classification after second pass | Rows | Notes |
| --- | ---: | --- |
| Real TealScript defect | 0 | No row has defensible implementation-owner evidence. |
| Artifact label holds strongly | 58 | Concrete source evidence: unsatisfied bars/session gates, hidden `display.none` plots, script-authored runtime refusal, out-of-range collections, prose/byte corruption. |
| Artifact label holds, but evidence is thin | 1 | `0981`; library example output depends on session/pivot accumulation and should not route without a targeted host trace. |
| Relabelled within not-ours | 1 | `0251` is better classified as invalid/non-actionable Pine: it declares `indicator()` but calls `strategy.entry()`. |

No row flips into the real-gap handoff set.

## Data-Gated Or Conditional Output Rows

These rows compile but their visible output sites are conditional and did not
fire on either synthetic profile used by the pinned corpus runner. The evidence
column names the concrete gate nearest the visible output, not only the
classifier label.

| Row | Verdict | Specific evidence |
| --- | --- | --- |
| `0219` | Artifact holds | `line.new()` is inside `plotLevel()`, reached only from populated `highs`/`lows` arrays; lines 27, 33, 43, 51 guard on `array.size(...) > 0`. Synthetic bars never populated those arrays. |
| `0231` | Artifact holds | Drawing calls are behind higher-timeframe array and last-bar gates: `if highArr.size() > tfDiff`, `if showLevels and barstate.islast`, then `if showLevels` before `line.new()`/`label.new()`. |
| `0339` | Artifact holds | Macro drawings are behind session transition tests such as `if not _time[1] and _time`; sampled bars never entered that macro window. |
| `0367` | Artifact holds | 3D renderer draws only under `if barstate.islast` and then loops over `scene_lines`; the synthetic run produced no retained visible scene output. |
| `0473` | Artifact holds | Support/resistance lines require confirmed requested pivots: `if not na(pivotHigh)` or `if not na(pivotLow)` after `request.security(... ta.pivothigh/ta.pivotlow ...)`. No pivot was confirmed on sampled bars. |
| `0491` | Artifact holds | Midnight/premarket drawings require time gates such as `isNewWednesdayData`, `isMidnightCandle`, `isNewDataPoint`, and `showMidnightLevelsInput`; default bars did not hit those timestamps. |
| `0547` | Artifact holds | Buy/sell labels are behind a Supertrend flip and symbol match: `if trend == 1 and trend[1] == -1`, then `if syminfo.tickerid == _ticker`. |
| `0568` | Artifact holds | Labels require nonzero external signal inputs: `is_buy = sig_entry > 0`, `is_sell = sig_entry < 0`; default `sig_entry` is `0.0`, so neither output branch fires. |
| `0577` | Artifact holds | LuxAlgo breakout labels are allocated only from breakout/test/retest state inside `testResistance()`/`testSupport()`; no breakout/test state was produced on sampled bars. |
| `0578` | Artifact holds | Same source shape as `0577`; duplicated corpus source, same breakout/test/retest gates. |
| `0623` | Artifact holds | Killzone output is driven by session booleans from `time("", session, gmt_tz)`, e.g. `t_v2`, `t_v3`, `t_v4`; sampled bars did not enter the configured killzone sessions. |
| `0699` | Artifact holds | Strategy order is gated by `if isBullishEngulfing`; the sampled bars did not produce the engulfing pattern. This is not a strategy-as-plot classifier miss. |
| `0717` | Artifact holds | Orders require pivot-derived `longCondition`/`shortCondition`; source gates on `if not na(pivLow)`, `if not na(pivHigh)`, then `if longCondition`. No qualifying pivot signal fired. |
| `0719` | Artifact holds | Backtest adapter orders are controlled by external booleans such as `startLongTrade`, `endLongTrade`, and `inTradeWindow`; defaults did not request a trade. |
| `0731` | Artifact holds | Orders require MACD/RSI/VWAP `entryCondition` plus `validPeriod`, then position-state gates before close/reversal calls. |
| `0767` | Artifact holds | Range box creation requires day/session state: `if newDay`, `if inRange and allowedDay`, then `if na(rangeBox)`. Synthetic bars did not hit the range session. |
| `0807` | Artifact holds | Stop entry is gated by `if longWindow`; sampled bars did not enter the four-bar window. |
| `0809` | Artifact holds | Stop order requires exact time and price proximity: `hour == 2 and minute == 45 and ... and nearHigh`. |
| `0819` | Artifact holds | Strategy order requires exact Tuesday midnight: `dayofweek == 2 and hour == 0 and minute == 0`; sampled bars did not hit it. |
| `0855` | Artifact holds | Pyramid close validation orders require exact `hour/minute` gates (`00:15`, `00:30`, `00:45`, etc.); default bars did not hit those times. |
| `0880` | Artifact holds | Percent-equity sizing probe uses `bool fire = dayofweek == 2 and hour == 0 and minute == 0`; sampled bars did not fire. |
| `0917` | Artifact holds | Entry requires `session.ispremarket` and `close > open`; default profile did not provide NASDAQ premarket context. |
| `0919` | Artifact holds | Stop order requires exact `hour == 2 and minute == 45` and zero position. |
| `0922` | Artifact holds | Entry/exit ordering validation uses exact intraday gates (`00:15`, `00:45`, `06:15`, `06:45`); sampled bars did not hit them. |
| `0923` | Artifact holds | Entry/close ordering validation uses exact intraday gates (`00:15`, `06:15`, `07:15`, `12:15`, etc.); sampled bars did not hit them. |
| `0924` | Artifact holds | Risk-gate probe issues orders only at exact times (`00:15`, `00:30`, `00:45`, `01:00`, `03:00`). |
| `0926` | Artifact holds | Stop-entry reversal grouping requires exact `hour == 0 and minute == 15`; sampled bars did not hit it. |
| `0927` | Artifact holds | Stop order requires exact time and `nearHigh`: `hour == 2 and minute == 45 and ... and nearHigh`. |
| `0928` | Artifact holds | Same Tuesday-midnight percent-equity gate as `0880`: `dayofweek == 2 and hour == 0 and minute == 0`. |
| `0946` | Artifact holds | Far-stop probe requires exact `hour == 14 and minute == 45`. |
| `0951` | Artifact holds | Market-close timing probe requires exact `03:15`, `05:15`, `15:15`, and `17:15` gates. |
| `0965` | Artifact holds | Immediate-close timing probe requires exact `02:15`, `03:15`, `10:15`, and `11:15` gates. |
| `0981` | Artifact holds, thin evidence | Library example output depends on `session.ispremarket`, `timeframe.change("D")`, 30-day rolling arrays, and confirmed pivots. The sampled profiles do not establish those host/session states. Do not route without a targeted host trace. |
| `0984` | Artifact holds | ZigZag labels require pivot-confirmation state (`length * 2 <= bar_index`) and display flags before `label.new()`; sampled bars did not produce a displayed pivot. |

## Global Output Not Evaluated Rows

| Row | Verdict | Specific evidence |
| --- | --- | --- |
| `0251` | Relabelled invalid/non-actionable | Declares `indicator("Positive Sign Test Simple")` but calls `strategy.entry("test", strategy.long)`. This is not a TealScript output defect; it is a malformed corpus probe mixing indicator and strategy surfaces. |
| `0276` | Artifact holds | All five global outputs are hidden harness signals: `plot(..., display=display.none)` for `signal`, `stopLoss`, `takeProfit`, `confidence`, and `exitSignal`. |
| `0329` | Artifact holds | Same hidden-signal adapter shape: every plot uses `display=display.none`; no chart-visible output is expected. |
| `0331` | Artifact holds | Same hidden-signal adapter shape: every plot uses `display=display.none`; no chart-visible output is expected. |
| `0394` | Artifact holds | Same hidden-signal adapter shape: every plot uses `display=display.none`; no chart-visible output is expected. |
| `0609` | Artifact holds | Same hidden-signal adapter shape: every plot uses `display=display.none`; no chart-visible output is expected. |

## Script-Authored Runtime Refusals Or Intentional Impossible State

These rows reached runtime and stopped for source-authored refusal logic or
explicit impossible collection/matrix states. None indicates a TealScript
semantic/parser handoff.

| Row | Verdict | Specific evidence |
| --- | --- | --- |
| `0168` | Artifact holds | Corpus compatibility probe explicitly calls `matrix.copy(values).pow(-1)`; Pine/TealScript should reject negative matrix powers. |
| `0202` | Artifact holds | `f_avwap(src, date, ...)` constructs arrays with length `date`; `date` derives from highest/lowest offsets and can be negative/invalid for early synthetic bars. The failure is source/data dependent before any chart output. |
| `0358` | Artifact holds | Smart Money Concepts source manipulates drawing/order-block arrays only after optional feature gates; failure is `Array index 2 is out of bounds. Array size is 2`, consistent with insufficient sampled structure state rather than a syntax/semantic gap. |
| `0408` | Artifact holds | The source explicitly calls `runtime.error("The max timeframe allowed is 15 minutes.")` when `timeframe.in_seconds() > timeframe.in_seconds(ma_tf1)`. Default profile violates the script's own chart-timeframe guard. |
| `0415` | Artifact holds | Duplicate Smart Money Concepts source shape from `0358`; array-index runtime failure occurs inside feature-gated structure state on insufficient sampled bars. |
| `0636` | Artifact holds | Source-authored guard raises `runtime.error("Not enough data to calculate Pivot Points...")`; the script requires more pivot history/lower timeframe data than the sampled profile supplies. |
| `0645` | Artifact holds | Same Strategy Pack source shape and same source-authored "Not enough data to calculate Pivot Points" guard as `0636`. |
| `0670` | Artifact holds | Corpus compatibility probe creates `array.new_int(100000)` and then `array.unshift(values, 1)`, intentionally exceeding the documented maximum array size. |
| `0680` | Artifact holds | Corpus compatibility probe calls `line.get_x1(array.get(values, 0))` on an empty `line[]` array. The out-of-bounds read is in the source. |

## Prose/Byte-Corruption Rows

| Row | Verdict | Specific evidence |
| --- | --- | --- |
| `0188` | Artifact holds | File begins with prose prompt text: `You are a professional PineScript version=6 developer.` It is not a Pine source file despite corpus extension. |
| `0189` | Artifact holds | Same prose prompt shape as `0188`, not Pine source. |
| `0461` | Artifact holds | Parse failure occurs on a comment line whose indentation contains full-width ideographic spaces before `//`. This is byte/layout corruption, not Pine grammar. |
| `0562` | Artifact holds | Duplicate Realtime Footprint source with the same full-width ideographic-space indentation before a comment. |
| `0990` | Artifact holds | Official-library mirror text contains non-breaking spaces in code tokens (`export method sharpeRatio`, parameter indentation). The failing byte is U+00A0-like whitespace, not ordinary Pine syntax. |
| `0991` | Artifact holds | Same non-breaking-space corruption in code tokens around `export calcCumulativeSeries(...)`. |
| `0992` | Artifact holds | Same non-breaking-space corruption in the import statement `import TradingView/ta/9 as ta`. |
| `0993` | Artifact holds | Same non-breaking-space corruption in `export er(...)` and surrounding library code. |
| `0994` | Artifact holds | Same non-breaking-space corruption in `export type Settings` and UDT fields. |
| `0995` | Artifact holds | Same non-breaking-space corruption in function declaration `metricNameAndDirectionToTicker(...) =>`. |
| `0999` | Artifact holds | Same non-breaking-space corruption in `export fred(...)` and other official-library mirror declarations. |

## Thin Evidence

Only `0981` is thin. It is still not a real-gap handoff because the row's
visible output depends on library example code plus host/session/pivot
conditions, and the current synthetic profiles do not settle whether Pine would
emit anything on the same data. If this row becomes important, the next useful
step is a targeted host trace for the library example under a chart/session that
can satisfy `session.ispremarket`, `timeframe.change("D")`, and pivot windows.

## Dispatch Impact

The v6 implementation-owner routing from
`external-pine-corpus-v6.dispatch-routing-audit-v1.md` is unchanged:

- Parser: 8 rows
- Semantic: 4 rows
- Runtime: 1 row

This pass only tightens the not-ours denominator. It finds no additional parser,
semantic, or runtime handoff.
