# External Pine Consensus Oracle Pilot v1

Measured commit: `75f4f9708ea304dfa2fcaf99bdaf3173f4bdf5f4`
Generated: 2026-09-12T01:28:02.701Z

## Headline

Same fixed 25-row pilot after the Pine-A-Script plot extraction repair and the TealScript hline fix: 8 agree, 0 external-consensus mismatch against TealScript, 17 voters differ.

Before Pine-A plot extraction repair on the same 25 rows: 7 agree, 0 external-consensus mismatches, 18 voters differ.
After Pine-A repair but before the TealScript hline fix: 7 agree, 1 external-consensus mismatch, 17 voters differ; v5 0223 marketfi.pine: external voters emitted Zero hline as 240 bars; TealScript emitted length 0.
After the hline fix on the same 25 rows: 8 agree, 0 external-consensus mismatch, 17 voters differ.

The original Class A plot-count ceiling is eliminated for this sample: the 11 `plot count N != 1` rows were a Pine-A-Script extraction/keying issue, not Pine disagreement. Remaining no-verdict rows are classified separately instead of masked.

The pilot uses exactly two external voters per Sam rule: PineTS and Pine-A-Script. PyneCore and pine2py are excluded; no third-voter hunt is part of this artifact.

## Lineage Check

Verdict: **no-shared-lineage-found**. This is not a kill finding.

- No fork relationship in local remotes: LuxAlgo/PineTS versus MeridianAlgo/Pine-A-Script.
- README/license attribution differs: PineTS is LuxAlgo AGPL/commercial; Pine-A-Script is MeridianAlgo MIT.
- TA/runtime structure differs: PineTS has per-method TypeScript factories with incremental state; Pine-A-Script has a compact JS builtins map and generated run(data) driver.
- No PineTS attribution or license header was found in Pine-A-Script implementation files; LuxAlgo mentions there are sample Pine scripts, not implementation provenance.

## Normalization

Plots are keyed by source order/index; titles are metadata only; malformed titles such as [object Object] do not affect matching. null/undefined/NaN/non-finite normalized to null. Float epsilon: 0.000001.

Pine-A-Script generated-code repair is applied before execution: `hline()` is treated as numeric plot output, and `plot(series, { ... title ... })` / `plot(series, { ... })` are rewritten so object-valued named-argument bundles do not collapse plot keys to `[object Object]`. Style options are dropped because this pilot compares numeric plot series only.

## MarketFI HLine Fix

Row `v5 0223` (mihakralj/pinescript:indicators/oscillators/marketfi.pine) was the first true catch from the pilot. Defect: hline registered visible plot metadata but never appended the constant price into the per-bar values array. Fix: hline now writes the hline price at the current bar and hline values participate in plot truncation for realtime replay. Result: The same 25-row pilot moved marketfi from external-consensus mismatch to consensus-agree.

## Zero-Length Plot Acceptance Audit

Pre-fix audit from latest accepted corpus reports at 5da61fcb1a plus runtime invariant: hline registered visible plot metadata with values: [], and visiblePlotsForCorpus counted hline plots without checking values length.

| Corpus | Accepted output rows | Accepted rows with hline | hline calls in accepted rows |
|---|---:|---:|---:|
| v5 | 867 | 216 | 526 |
| v6 | 787 | 94 | 222 |
| v7 | 305 | 24 | 59 |
| total | 1959 | 334 | 807 |

Accepted rows whose visible output appears to be hline-only before the fix: 1. This bounds the produced-output headline inflation to one row in the latest reports; the larger issue was wrong/empty hline value payloads in 334 accepted rows.
- `v7 0049` sources/0049__helenananaa-pine-compat-runtime__unsupported_array_numeric_float_const_input_return_qualifier.pine: 14 hline plots.

## Buckets

| Bucket | Rows | Meaning |
|---|---:|---|
| consensus-agree | 8 | External voters agree and TealScript matches. |
| external-consensus mismatch | 0 | External voters agree and TealScript differs. |
| warmup-seed-disagreement | 13 | External voters differ at bar 0 or 1; warmup/seeding remains semantics and is not masked. |
| value-disagreement | 4 | External voters differ after the first two bars or by output-shape/value behavior. |
| harness-plot-count-repaired | 0 | Remaining rows with the original one-plot extraction ceiling. |

## Rows

| Corpus | Row | Declared | Result | Bucket | Voter plots | TealScript plots | First difference | Source |
|---|---:|---:|---|---|---:|---:|---|---|
| v5 | 0023 | v6 | agree | consensus-agree | 1 | 1 |  | mihakralj/pinescript:indicators/core/avgprice.pine |
| v5 | 0025 | v6 | agree | consensus-agree | 1 | 1 |  | mihakralj/pinescript:indicators/core/medprice.pine |
| v5 | 0027 | v6 | voters-differ | warmup-seed-disagreement | 1 | 1 | plot[0][0] null != 0 | mihakralj/pinescript:indicators/core/midprice.pine |
| v5 | 0028 | v6 | agree | consensus-agree | 1 | 1 |  | mihakralj/pinescript:indicators/core/typprice.pine |
| v5 | 0029 | v6 | agree | consensus-agree | 1 | 1 |  | mihakralj/pinescript:indicators/core/wclprice.pine |
| v5 | 0123 | v6 | voters-differ | warmup-seed-disagreement | 2 | 2 | plot[0][1] 4.5107202216 != 1.5778624566856694 | mihakralj/pinescript:indicators/filters/sak.pine |
| v5 | 0151 | v6 | voters-differ | warmup-seed-disagreement | 2 | 2 | plot[0][1] 35.5449588349 != 35.98885534836724 | mihakralj/pinescript:indicators/momentum/sam.pine |
| v5 | 0215 | v6 | voters-differ | value-disagreement | 3 | 3 | plot[0][10] 0.6238040734 != 0.2746530721670274 | mihakralj/pinescript:indicators/oscillators/fisher04.pine |
| v5 | 0222 | v6 | voters-differ | warmup-seed-disagreement | 4 | 4 | plot[0][1] 0.7156617808976393 != 0.5612948251991328 | mihakralj/pinescript:indicators/oscillators/lrsi.pine |
| v5 | 0223 | v6 | agree | consensus-agree | 2 | 2 |  | mihakralj/pinescript:indicators/oscillators/marketfi.pine |
| v5 | 0310 | v6 | voters-differ | warmup-seed-disagreement | 1 | 1 | plot[0][1] 102.0194444526 != 101.68273323191607 | mihakralj/pinescript:indicators/trends_FIR/rwma.pine |
| v5 | 0314 | v6 | voters-differ | warmup-seed-disagreement | 1 | 1 | plot[0][0] null != -0.9493125000000001 | mihakralj/pinescript:indicators/trends_FIR/sp15.pine |
| v5 | 0315 | v6 | voters-differ | warmup-seed-disagreement | 1 | 1 | plot[0][0] null != 16.87666666666667 | mihakralj/pinescript:indicators/trends_FIR/swma.pine |
| v5 | 0757 | v5 | voters-differ | warmup-seed-disagreement | 3 | 3 | plot[0][0] 0.7 != null | palitojendthen/pinescript:indicator/adaptive_rsi.pine |
| v5 | 0782 | v5 | voters-differ | value-disagreement | 11 | 11 | plot[0][99] 113.601273936 != null | suyons/tradingview-indicators:bollinger-bands/05-fibonacci-bollinger-bands.pine |
| v5 | 0787 | v5 | agree | consensus-agree | 1 | 1 |  | g-moe/Trading-Indicators:Tradingview/mtf-2tf-cipher.pine |
| v5 | 0911 | v5 | voters-differ | value-disagreement | 2 | 2 | plot[0][17] 97.6631526645 != 97.88080043313671 | Web3Degenerate/pine-script-mastery-course:basic-pine-script/6.-Namespaces-and-Libraries.pine |
| v5 | 0923 | v5 | agree | consensus-agree | 1 | 1 |  | quant5-lab/runner:strategies/test-ta-calls.pine |
| v5 | 0942 | v5 | voters-differ | warmup-seed-disagreement | 2 | 2 | plot[0][0] null != 101.26 | TWODS-CAPITAL/Trading-View-Indicators:Technical-Indicators/Technical Indicators are Here🤩/Moving-Average-Exponential.pine |
| v5 | 0988 | v5 | voters-differ | warmup-seed-disagreement | 2 | 2 | plot[0][0] null != 101.26 | Core-Four/Stock-Recommendation-System:EMA.pine |
| v6 | 0176 | v5 | voters-differ | warmup-seed-disagreement | 4 | 4 | plot[0][0] null != 0 | Zettt/pinescripts:ATR Ratio Percentile.pine |
| v6 | 0179 | v5 | voters-differ | value-disagreement | 7 | 7 | plot[0][27] 57.4795489989 != null | thanhnguyennguyen/tradingview-pine-scripts:scripts/ADX+RSI.pine |
| v6 | 0186 | v5 | voters-differ | warmup-seed-disagreement | 4 | 4 | plot[0][0] null != 0 | jawauntb/trading-scripts:short-term-alpha.pine |
| v6 | 0191 | v5 | agree | consensus-agree | 1 | 1 |  | JackZhao516/Smrti-tradingview-pine-scripts:volume-price.pine |
| v6 | 0201 | v5 | voters-differ | warmup-seed-disagreement | 1 | 1 | plot[0][1] 101.26 != 102.01944445255748 | damianhunziker/damiansHeatmapGenerator:kama_values.pine |

## Warmup Characterization

The 13 warmup rows are not 13 independent semantic disputes. They split into windowed-TA warmup, hline first-bar behavior, and custom recursive seed differences. Warmup bars are not masked; documented/vector-backed rows are adjudicated with provenance `documented` or `hand-derived`, while custom script-specific seeds stay no-consensus.

| Row | Class | Provenance | Behavior | TealScript status |
|---|---|---|---|---|
| v5 0027 | windowed TA warmup | hand-derived | PineTS and TealScript emit na at bar 0; Pine-A emits a partial ta.highest/ta.lowest value. The local value-vector warmup guard requires ta.highest/ta.lowest(length=5) first valid at bar 4; this row uses length 2, so bar 0 is na. | matches documented/vector-backed warmup |
| v5 0123 | custom recursive seed | undocumented | PineTS and TealScript agree at bar 1; Pine-A seeds the custom filter differently. Custom recurrence; no manual/vector oracle for this script-specific seed. | no documented verdict |
| v5 0151 | custom recursive seed | undocumented | PineTS and TealScript agree at bar 1; Pine-A seeds the custom momentum filter differently. Custom recurrence; no manual/vector oracle for this script-specific seed. | no documented verdict |
| v5 0222 | custom recursive seed | undocumented | PineTS and TealScript agree at bar 1; Pine-A seeds LRSI differently. Custom recurrence using nz/history; no manual/vector oracle for this script-specific seed. | no documented verdict |
| v5 0310 | custom recursive seed | undocumented | PineTS and TealScript agree at bar 1; Pine-A seeds RWMA differently. Custom moving-average function; no manual/vector oracle for this script-specific seed. | no documented verdict |
| v5 0314 | custom FIR warmup | undocumented | PineTS and TealScript emit na at bar 0; Pine-A emits a partial FIR value. Script-specific FIR filter; no manual/vector oracle. | no documented verdict |
| v5 0315 | windowed TA warmup | hand-derived | PineTS and TealScript emit na at bar 0; Pine-A emits a partial weighted value. The local value-vector ta.swma oracle and warmup guard require first valid bar 3. | matches documented/vector-backed warmup |
| v5 0757 | hline constant from first bar | documented | PineTS and TealScript emit the hline value at bar 0; Pine-A emits null for that hline on bar 0. hline is a constant horizontal level; the MarketFI fix now emits per-bar hline values from bar 0. | matches documented visual-output behavior |
| v5 0942 | EMA seed | hand-derived | Pine-A and TealScript emit the first source value at bar 0; PineTS emits na. The local ta.ema value vector seeds EMA from the first non-na source and is valid at bar 0. | matches hand-derived oracle |
| v5 0988 | EMA seed | hand-derived | Pine-A and TealScript emit the first source value at bar 0; PineTS emits na. The local ta.ema value vector seeds EMA from the first non-na source and is valid at bar 0. | matches hand-derived oracle |
| v6 0176 | windowed TA warmup | hand-derived | PineTS and TealScript emit na at bar 0; Pine-A emits 0. The local ta.atr, ta.percentrank, and ta.ema warmup guards require the ATR/percentrank chain to remain na at bar 0. | matches vector-backed warmup |
| v6 0186 | windowed TA warmup | hand-derived | PineTS and TealScript emit na at bar 0; Pine-A emits 0. The source chains ta.sma/ta.stdev/ta.ema; local vectors require ta.sma and ta.stdev to remain na until their windows are filled. | matches vector-backed warmup |
| v6 0201 | custom KAMA seed | undocumented | PineTS and TealScript emit the prior seed at bar 1; Pine-A advances the custom KAMA recurrence differently. Script-defined KAMA recurrence; no manual/vector oracle for this exact custom implementation. | no documented verdict |

## Inputs

Bars: `packages/tealscript/reports/external-pine-consensus-pilot-bars-v1.json`, 240 bars, sha256 `f2700a823e6c10c2fb51410a72f2e08b7b2170ae8c8efa409ec2246b2c0a24e7`.
PineTS: https://github.com/LuxAlgo/PineTS local head `1fdcf4ab5f8994046f1a95eb741d0fec00e34328`.
Pine-A-Script: https://github.com/MeridianAlgo/Pine-A-Script local head `6f9e99cd0a0bc895ac661cbfbe2c9ae1fa0df2c9`.

## Selection

The pilot selected 12 declared-v5 and 13 declared-v6 currently executable indicator/study scripts with plain `plot()` outputs and without host-required surfaces, scanning the committed corpus union in order. Synthetic compat/runtime stress fixtures were excluded from the selection pool. Rejections before selection are engine/readiness filters, not corpus classifications.

Rejected before selection while filling quotas: 0. The JSON report includes a sample for reproducibility.

