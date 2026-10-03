# Register TA confirmation probe 1 v1

Source: `coverage-register-ta-1-v1.pine`; exactly 60 uniquely titled numeric plots, all `display.data_window`, precision16, max_bars_back500. Capture on standard BINANCE:BTCUSDT 2-minute candles and export the full dataset starting at bar_index0 with at least256 historical bars. Companion `coverage-register-ta-1-v1.columns.json` preserves source-order column meaning. The capture is pending; local preflight is not TV confirmation.

| Columns | Count | Purpose |
|---|---:|---|
| Native input_* | 6 | OHLCV plus bar_index, for exact replay and verification |
| stimulus_* | 12 | Export every synthetic zero/NA/flat/range/phase input |
| Native NVI/PVI and equivalent controls | 4 | Native builtin vs current official formula, chart inputs |
| Synthetic VI documented and legacy controls | 8 | Four independent parameterized scenarios with negative controls |
| KC/KCW builtin and formula | 10 | False true-range setting, independent chart high-low range, synthetic explicit source holes |
| Linear percentile and percentrank | 8 | Clean, interior holes, leading holes, independent contiguous-window controls |
| Momentum | 6 | Export offset/source, compare direct/expression builtin to source-source[offset] |
| Stoch | 6 | Length4 and length1 flat0/0, burst range recovery and return to flat |
| Total | 60 | No dynamic colors or extra plot-count consumers |

Stimuli repeat with `phase=bar_index%64`: zero close atphase8; close NA at12/13; zero volume at16; volume NA at20; next-bar21 tests missing prior volume; synthetic Stoch range expands at24/25 and becomes flat again. Leading source NA at absolute bars0..2. Momentum offsets transition1→3→1→6→1 atphase8/16/24/32. All stateful calls execute every bar at distinct written call sites.

The high-low Keltner range necessarily uses native chart OHLC; the explicit source is synthetic and independently missing. The formula uses separate ta.ema source and ta.ema(high-low) calls. Compare native KC/KCW with those controls before and after source holes; do not substitute a different EMA seeding definition.

**NVI/PVI limitation:** ta.nvi and ta.pvi are no-argument native series; Pine provides no synthetic close/volume parameters. Derived synthetic series do not alter their internal native inputs. The four `*_native_*` columns can confirm actual builtins only for predicates exercised by exported native OHLCV. The eight `*_synthetic_*` columns confirm execution of the explicit documented and legacy formulas on TradingView; they cannot establish builtin zero-close/missing-volume behavior. Leave those builtin register predicates UNEXERCISED if the native dataset lacks the stimulus. Do not promote those rows to CONFIRMED-BY-TV merely because synthetic formula controls differ. Real builtin confirmation needs an actual native chart dataset with those observations (or a distinct authorized oracle input mechanism).

Stoch all-flat outputs may be entirely missing; empty cells are meaningful NA, not capture failure or zero. The finite recovery pair checks that the stochastic instrument is live, while length1 makes the flat ratio observable from the first bar. Keep finite differences, NA mismatches, and hypothesis controls distinct when adjudicating.

Local preflight: `check-coverage-register-ta-1-v1.mts` executed this exact source on512 hand-built bars using pine-fix-register-ta commit82570879ed, yielding60 plots and zero engine errors. Output: `coverage-register-ta-1-v1.preflight.json`. This checks local parsing/execution and ordered column counts only. No engine or repository files were changed for this probe.

Rebuild: `python3 build-coverage-register-ta-1-v1.py`. Source SHA256: d1800d60f28a0bc7a9a7c499841d20ca96615243a3b6df5a68c663801beea22d.
