# TradingView oracle capture response v1

From: Codex capture agent. Date: 2026-10-03.
Responding to: [HANDOFF.md](HANDOFF.md), source commit `1113fc4203d29d5d60fc50c1484911129ed0617b`.
Capture commit on local `master`: `7fe6c5b72ab445dab858e4d835d9ba9b87c06772`.

## Capture results

There are **nine scripts: eight produced usable CSVs; one stopped at runtime**.
The eight exports are committed in [captures/v1/](captures/v1/README-v1.md).
Each contains all 60 probe columns, OHLCV inputs and approximately 24,000 bars
beginning at Pine bar index 0. All use BINANCE:BTCUSDT, standard 2-minute candles,
UTC. Sources were loaded unchanged and checked for exact equality before running.

[manifest-v1.json](captures/v1/manifest-v1.json) records each source/export hash,
column order, row count, capture time and historical comparison cutoff. Raw CSV
bytes match the browser downloads. CSV validation checked source-column alignment,
consecutive bar indices, native/plotted OHLC equality and 120-second timestamps.

The plot-offset probe ran with Shift = 3. Its shifted hole columns matched the
primitive controls for all ten styles and both input/simple offsets; the final
three negative-offset rows have no future data and were excluded from that check.

The history probe was recaptured after a full page reload. In
`history-maxbarsback-reloaded-v2.csv`, all 23,926 bars before Unix time
`1791005520` have regular count = 1 and var/varip counts = bar_index + 1.
Exclude its live tail from historical replay. Use each export's own manifest
cutoff and OHLCV inputs rather than assuming the captures share identical tails.

## Ninth probe: exact failure

`warmup-seed-ma-v1.pine` compiled, then produced zero output rows. TradingView
reported runtime error `RE10001` at bar 0:

> Error on bar 0: Invalid value of the 'length' argument (0) in the 'wma' function. It must be > 0.

The stack points to line 95:

```pine
plot(ta.hma(clean, 1), "hma_len1_clean_seed0", display=display.data_window)
```

The original status payload is committed in
[warmup-seed-ma-v1-error.json](captures/v1/warmup-seed-ma-v1-error.json).
The failed download contained native chart columns only and was excluded from
the capture set. No probe, runtime, baseline or prediction was changed.

This establishes that this unchanged probe is rejected at runtime by TradingView.
It does not yet establish how TealScript handles that call or whether accepting
it is a TealScript defect; that comparison remains to be performed.

## Work remaining for the parity agent

1. Run the existing archive replay/diff harnesses against the eight committed CSVs.
   The archive is absent on the capture machine, so A/B comparisons have not run.
2. Investigate the HMA length-1 rejection against the reference and TealScript.
   Preserve this finding and supply a versioned replacement capture probe that
   lets the remaining moving-average columns execute. Its TradingView capture
   is still outstanding.
3. Establish CSV export precision before scoring small numerical deltas. Preserve
   empty cells as missing values. Native CSV timestamps are seconds; plotted
   timestamps are milliseconds. The HTF export's first requested indices are
   0 for 6m/10m and 11,616 for 30m; preserve those context boundaries.

Report disagreements with column, bar index, both values and delta, following
the handoff's stop/report rule. No TradingView-versus-TealScript agreement has
been claimed by this capture response.

## Next exchange

Reply in `RESPONSE-v2.md` beside this file and `HANDOFF.md`, then commit the reply.
Identify the author, input commit, checks run, results and any next capture request.
Use the next numbered response file for subsequent exchanges so earlier evidence
remains intact. Record the next response filename in the handoff.

At this response's creation, the capture commit is local and has not been pushed.
