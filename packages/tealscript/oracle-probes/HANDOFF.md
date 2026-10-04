# TradingView oracle capture — handoff

> **Next capture round: v3.** Start at [`v3/HANDOFF-v3.md`](v3/HANDOFF-v3.md) — 104 outcome scripts plus 7
> supplementary (6 conflict probes with CSV export, 1 bool-default outcome). The v3 reply goes in
> `v3/captures/v3/RESPONSE-v3.md`, evidence beside it. v2 is done (`v2/RESPONSE-v2.md`, `v2/RESPONSE-v3.md`).
> **Then round v4.** After v3, do [`v4/HANDOFF-v4.md`](v4/HANDOFF-v4.md) — 76 scripts: 13 numeric CSV first
> (statistical moments and ranked-window settle ~60 precision/missing-slot columns), 8 screenshot probes, 55 outcome.
> Reply at `v4/captures/v4/RESPONSE-v4.md`.
> **Then round v5.** After v4, do [`v5/HANDOFF-v5.md`](v5/HANDOFF-v5.md) — 130 scripts: 20 numeric CSV,
> 14 screenshot, 96 outcome (`SHA256SUMS-v2.txt` pins every source). Reply at `v5/captures/v5/RESPONSE-v5.md`.
> **Then round v6.** After v5, do [`v6/HANDOFF-v6.md`](v6/HANDOFF-v6.md) — 18 scripts: 8 numeric CSV, 10 outcome
> (`SHA256SUMS` pins every source). Reply at `v6/captures/v6/RESPONSE-v6.md`.
> **Then round v7.** After v6, do [`v7/HANDOFF-v7.md`](v7/HANDOFF-v7.md) — 215 scripts: 42 numeric CSV,
> 55 screenshot, 118 outcome; per-script steps in `v7/instructions/` (`SHA256SUMS` pins every source).
> Reply at `v7/captures/v7/RESPONSE-v7.md`.
> **Then round v8.** After v7, do [`v8/HANDOFF-v8.md`](v8/HANDOFF-v8.md) — 33 scripts; per-script steps in
> `v8/instructions/` (`SHA256SUMS` pins every source). Reply at `v8/captures/v8/RESPONSE-v8.md`.
> **Then round v9.** After v8, do [`v9/HANDOFF-v9.md`](v9/HANDOFF-v9.md) — 95 scripts; per-script steps in
> `v9/instructions/` (`SHA256SUMS` pins every source). Reply at `v9/captures/v9/RESPONSE-v9.md`.
> **Then round v10.** After v9, do [`v10/HANDOFF-v10.md`](v10/HANDOFF-v10.md) — 13 scripts; per-script steps in
> `v10/instructions/` (`SHA256SUMS` pins every source). Reply at `v10/captures/v10/RESPONSE-v10.md`.
> **Then round v11.** After v10, do [`v11/HANDOFF-v11.md`](v11/HANDOFF-v11.md) — 59 scripts; per-script steps in
> `v11/instructions/` (`SHA256SUMS` pins every source). Reply at `v11/captures/v11/RESPONSE-v11.md`.
> **Then round v12.** After v11, do [`v12/HANDOFF-v12.md`](v12/HANDOFF-v12.md) — 30 scripts; per-script steps in
> `v12/instructions/` (`SHA256SUMS` pins every source). Reply at `v12/captures/v12/RESPONSE-v12.md`.
> **Then round v13.** After v12, do [`v13/HANDOFF-v13.md`](v13/HANDOFF-v13.md) — 40 scripts; per-script steps in
> `v13/instructions/` (`SHA256SUMS` pins every source). Reply at `v13/captures/v13/RESPONSE-v13.md`.
> **Then round v14.** After v13, do [`v14/HANDOFF-v14.md`](v14/HANDOFF-v14.md) — 13 scripts; per-script steps in
> `v14/instructions/` (`SHA256SUMS` pins every source). Reply at `v14/captures/v14/RESPONSE-v14.md`.
>
> **Then round v15.** After v14, do [`v15/HANDOFF-v15.md`](v15/HANDOFF-v15.md) — 37 scripts; per-script steps in
> `v15/instructions/` (`SHA256SUMS` pins every source). Reply at `v15/captures/v15/RESPONSE-v15.md`.
>
> **Then round v16.** After v15, do [`v16/HANDOFF-v16-v2.md`](v16/HANDOFF-v16-v2.md) — 13 scripts; per-script steps in
> `v16/instructions/` (`SHA256SUMS` pins every source). Reply at `v16/captures/v16/RESPONSE-v16.md`.
>
> **Then round v17.** After v16, do [`v17/HANDOFF-v17.md`](v17/HANDOFF-v17.md) — 15 scripts (plus 9 v13 reuse references in
> `v17/V13-REUSE-REFERENCES-v1.json`); per-script steps in `v17/instructions/`. Reply at `v17/captures/v17/RESPONSE-v17.md`.
>
> **Then round v18.** After v17, do [`v18/HANDOFF-v18.md`](v18/HANDOFF-v18.md) — 6 drawing-cadence scripts; per-script steps
> and predicted counts in `v18/instructions/`. Reply at `v18/captures/v18/RESPONSE-v18.md`.
>
> **Then round v19.** After v18, do [`v19/HANDOFF-v19.md`](v19/HANDOFF-v19.md) — 4 host-context companion scripts, each
> captured beside its paired original; steps in `v19/instructions/`. Reply at `v19/captures/v19/RESPONSE-v19.md`.

Agent exchange: [capture response v1](RESPONSE-v1.md). The next reply belongs in
`RESPONSE-v2.md` beside this handoff; commit responses so both machines can read them.

## What these are

Nine Pine v6 indicator scripts, **60 plots each**, written to extract **TradingView's
own computed values as numbers** via chart-data export. 540 oracle values total.

This is the first real oracle this project has had. Every prior "verification" compared
TealScript against TealScript, against documentation, or against another JavaScript
clone of Pine.

## Why these and not real indicators

These scripts call `ta.*` **directly**, so TradingView's engine evaluates the exact
functions under test. We do not need TradingView's built-in indicators or published
community scripts.

It also maximises oracle values per click. TradingView caps plots at 64 per indicator,
so each script is packed to 60. A built-in indicator spends one indicator slot for ~3
series; these spend one slot for 60.

## Capture procedure

For each script: paste into Pine Editor → Add to Chart → export chart data as CSV.

**If a script fails to compile, STOP and report the exact error.** That is itself a
finding — it means we accept Pine that TradingView rejects, which is compiler evidence
we have never had.

**Verify every export before moving on:**

1. `input_bar_index` starts at **0**
2. **All 60 columns are present.** The OHLCV inputs are plotted into the data window
   deliberately so the CSV is self-contained and we can replay identical bars. A CSV
   missing its input columns is unusable.
3. Enough rows for that script's requirement below — several probes key their `na`
   holes to fixed bar indices and need rows through recovery.

## The nine scripts and their chart requirements

| Script                    | Probes                                                                                                                                                            | Chart requirement                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `na-holes-crosses-v1`     | crossover, crossunder, cross, rising, falling, change, barssince, valuewhen — clean / na-at-start / na interior hole, with holes injected into A and B separately | bar_index **0–127**                                               |
| `na-holes-oscillators-v1` | rsi, stoch, bb, bbw, kc, kcw, cci, cmo, wpr with injected holes                                                                                                   | index **0 → 80+** (holes at 40–41, needs recovery)                |
| `warmup-seed-ma-v1`       | sma, ema, rma, wma, vwma, swma, alma, hma, linreg across lengths including 1 and 2                                                                                | phases **−5 → ≥91**, prefer **159**; holes at 1, 2, 40, 41, 80–85 |
| `rma-chain-v1`            | rma → atr → rsi bar by bar, six gap regimes                                                                                                                       | index **0 → ≥109** so seeded ATR/RSI replay exactly               |
| `extrema-barsago-v1`      | highest, lowest, highestbars, lowestbars, pivothigh, pivotlow, hand-built Aroon — sign and offset convention                                                      | **192 bars**                                                      |
| `volume-vwap-v1`          | vwap, obv, pvt, nvi, pvi, accdist, mfi, cum — 20 MFI and 14 anchored-VWAP probes                                                                                  | index **0**, **≥100 bars**; replay rejects truncated history      |
| `plot-offset-visual-v1`   | plot offset — const and input, positive and negative                                                                                                              | leave the **Shift input at 3**                                    |
| `htf-request-security-v1` | request.security at HTF 6/10/30, lookahead on/off, gaps on/off, security_lower_tf                                                                                 | **2-minute chart**                                                |
| `history-maxbarsback-v1`  | history operator depth, max_bars_back, var/varip as series                                                                                                        | **1800+ bars**; reload before comparing historical varip          |

Premium allows 25 indicators per chart, so all nine fit in **two charts**: the seven
"any symbol" scripts on one chart with 1800+ bars loaded, and `htf-request-security`
plus `plot-offset-visual` on a 2-minute chart.

## Where the expected values live

The committed [capture set v1](captures/v1/README-v1.md) contains eight raw
TradingView CSVs plus the exact runtime error from the unchanged
`warmup-seed-ma-v1` probe. Its manifest records source/export hashes, chart
context, column order and historical comparison cutoffs. Sam explicitly requested
this capture set be committed for replay on another machine; the companion
predictions and harnesses remain in the archive below.

Each script has a companion `<name>-v1.md` in
`~/cs/docs/tealscript-parity-archive/oracle-probes/` carrying, per column: what it
tests, TealScript's **current** value, and a **prediction** of agree/disagree that was
frozen **before any export existed**.

Those predictions are on the record deliberately. A wrong prediction is the most
informative outcome available — do not quietly discard one.

Replay and diff harnesses already exist alongside those files. Use them rather than
writing new ones.

## Rules for whoever processes the CSVs

Every one of these was learned at cost on this work.

- **A disagreement is a finding to REPORT, not to fix.** Do not touch the runtime, a
  vector, or an expectation. Report the column, bar index, both values and the delta,
  and stop.
- **Never adjust a prediction or an expectation to match the oracle.** If TealScript
  disagrees with TradingView, TealScript is probably wrong — but establish which,
  against documentation, before anyone changes code. A suite that was quietly tuned to
  agree with its own engine is exactly the failure this project is unwinding.
- **Verify column alignment first, never assume it.** `plot(offset)` shifts a series,
  so a shifted column does not line up with raw rows. Each script includes primitive
  controls specifically to distinguish shifted from raw — confirm the controls agree
  before trusting anything else in that file.
- **Establish export precision before calling a 1e-9 difference a defect.**
- **A clean agreement is a real result.** It converts TRACE-REQUIRED into
  DOCUMENTED-VERIFIED, which is the whole point of the exercise.
- **Suspect the instrument before the engine.** A whole column or whole family
  disagreeing uniformly is more likely a misread column, a chart-setting mismatch, or a
  bar-alignment error than a uniform engine defect. That has been a false headline six
  times on this work.
- **A definition difference is not a defect.** TA-Lib's CMO is Wilder-smoothed; Tulip
  rounds HMA's `sqrt` differently at N=3 and N=7; a signed-flow MFI formula is not
  Pine's MFI contract. Only score a disagreement when both sides compute the **same
  documented thing**.

## Scope

**Drawn indicators only.** Strategies, backtesting, orders, fills, commission and
margin are explicitly out of scope.

## What this capture cannot settle

- **Appearance.** Colour, style and linewidth are not exportable — only values, plus
  `offset` because it shifts the series.
- **Builtins with implicit OHLC.** `ta.wpr(length)` takes no source argument, so native
  Pine cannot inject an `na` hole into it. The script carries a clean builtin control
  plus formula-based hole probes, which cannot close the builtin's own hole policy.
- **Series offsets under v6.** Not compilable; documented and excluded.

## Supporting material (not committed — too large / generated)

In `~/cs/docs/tealscript-parity-archive/`:

- `oracle-probes/` — per-script column keys, frozen predictions, measured TealScript
  baselines, CSV replay and diff harnesses
- `reference/pine-v6-reference-v1.json` — all **1,446** official v6 reference entries,
  472 with remarks, 639 with examples. Remarks carry the load-bearing edge-case rules.
  Check this before declaring anything undocumented: several items the archive calls
  TRACE-REQUIRED turn out to be specified there.
- `ledger/` — the parity denominator, per surface, with an oracle status per item
- `ta-verify/` — `ta.*` family verification against published formulas and non-JS
  independent libraries
