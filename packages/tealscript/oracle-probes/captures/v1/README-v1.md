# TradingView oracle captures v1

Captured on 2026-10-03 from TradingView's Pine v6 engine through the Chrome MCP.
Sources are the unmodified probes from commit `1113fc4203d29d5d60fc50c1484911129ed0617b`.
Sam explicitly requested these exports be committed on `master` for A/B replay on the other machine.

All captures use **BINANCE:BTCUSDT, standard 2-minute candles, UTC**. Each CSV is
a byte-for-byte TradingView chart-data download with 5 native chart columns and
all 60 probe columns. The exported OHLCV inputs are included. Every export starts
at Pine bar index 0 and retains the complete loaded dataset, including its live tail.

| Probe | CSV rows | Result |
| --- | ---: | --- |
| na-holes-crosses-v1 | 23,923 | Captured |
| na-holes-oscillators-v1 | 23,923 | Captured |
| rma-chain-v1 | 23,924 | Captured |
| extrema-barsago-v1 | 23,924 | Captured |
| volume-vwap-v1 | 23,924 | Captured |
| plot-offset-visual-v1 | 23,925 | Captured, Shift = 3 |
| htf-request-security-v1 | 23,925 | Captured on the required 2-minute chart |
| history-maxbarsback-v1 | 23,927 | Captured after a full page reload; file is `history-maxbarsback-reloaded-v2.csv` |
| warmup-seed-ma-v1 | — | TradingView runtime error; exact status saved in `warmup-seed-ma-v1-error.json` |

## Replay

Read `manifest-v1.json` for source/export SHA-256 hashes, exact column order,
capture times, index-column names, precision settings and historical comparison
cutoffs. Preserve empty CSV cells as missing values. Native `time` is Unix
seconds; plotted `time` values are milliseconds. Load each CSV's own OHLCV inputs:
the live tail differs between captures.

Use the existing companion replay/diff harnesses in
`~/cs/docs/tealscript-parity-archive/oracle-probes/` on the other machine.
That archive is absent on this machine, so no TealScript comparison or expectation
changes were performed here. Report disagreements as required by `../../HANDOFF.md`.

For historical comparisons, use rows with `time` strictly below each manifest
entry's `historical_compare_before_unix_seconds`. The history capture's full page
reload began at 05:33:21 UTC; all 23,926 bars before 05:32:00 UTC have verified
`var` and `varip` count controls equal to `bar_index + 1`. Its live tail contains
intrabar executions and must be excluded from a historical-only replay.

The offset export preserves TradingView's shifted rows. All ten styles' +3/-3
hole series match their primitive history/future controls, as do input and simple
offset variants. The last three negative-offset rows have no future source data
and were excluded from the future-control alignment check.

The HTF contexts have different starting indices: 6-minute and 10-minute start
at 0, while the first exported 30-minute index is 11,616. Preserve the requested
context indices/timestamps and previous-close columns when constructing replay
datasets. The 1-minute first/last OHLCV, timestamps, hole values and intrabar count
are exported by the probe itself.

`precision` in the manifest is the Pine declaration's display setting. CSVs retain
the downloaded decimal strings; export rounding was not independently measured.
Establish numerical tolerance before declaring a small delta a defect.

## Moving-average finding

The unchanged warmup probe compiled, then TradingView stopped on bar 0 with
`RE10001`: `Invalid value of the 'length' argument (0) in the 'wma' function. It must be > 0.`
Its stack points to source line 95, `ta.hma(clean, 1)`. TradingView reported zero
output rows. The failed download contained native chart data only and is excluded
from this capture set. No probe, runtime, baseline or prediction was adjusted.

## Capture validation

Python CSV checks verified all eight exports' exact downloaded bytes, all 60 plot
names in source order, consecutive indices beginning at 0, input OHLC equal to
native chart OHLC, continuous 120-second timestamps, and each probe's minimum
history requirement. Separate checks verified offset control alignment and the
reloaded history probe's historical counter controls.
