# TradingView v53 supplementary native-pending handoff v1

Five indicators cover exactly the five supplementary rows omitted by v52: length-1 EMA/RMA signed zero; actual flat-bar III/WVAD 0/0; lane-B119 all-missing ta.max seed; lane-B120 direct ta.vwap variable missing inputs; lane-B121 direct ta.accdist variable missing inputs. Each script targets one row. V52 and its 34 register rows are unchanged.

Capture in bundle-manifest-v1.json order with the per-source instructions. Verify sha256sum -c SHA256SUMS. Every script is v6, bounded by calc_bars_count=32, fewer than 64 plots and no collections/UDTs. Retain actual closed/live alignment using source time/index plus the local sample counter. Reply at v53/captures/v53/RESPONSE-v53.md.

For signed zero, capture exact text first, then the separate reciprocal-enabled attempt. Preserve source +0/-0/finite/missing controls. Equal numeric zero or observers that mask a sign leave the bit question INCONCLUSIVE; observer division errors do not prove EMA/RMA errors.

For III/WVAD and the two implicit-source variables, actual native chart input conditions are required. Do not claim a flat/missing/recovery answer from a synthetic formula, an assumed ticker policy or a window without the eligible masks. A dataset with no event remains INCONCLUSIVE. Formula-only observers are optional and separate from direct builtin evidence. The III/WVAD v5 facet stays unobserved: this round supplies one v6 script for that row rather than extrapolating across versions.

Native phase and values are UNSPECIFIED. Save raw source-hashed CSV/Pine Logs, Data Window/diagnostic/settings screenshots and complete feed/chart/session/account/build/input/cutoff context. No general TA precision, seeding, missing-input, version or realtime claim follows beyond the reached named cases.

## Row-to-source checklist v1

- ema-rma-singleton-signed-zero-v1: [ema-rma-length-one-signed-zero-v53-v1.pine](ema-rma-length-one-signed-zero-v53-v1.pine)
- iii-wvad-flat-bar-zero-over-zero-v1: [iii-wvad-flat-zero-range-v53-v1.pine](iii-wvad-flat-zero-range-v53-v1.pine)
- lane-b:119: [max-all-missing-seed-v53-v1.pine](max-all-missing-seed-v53-v1.pine)
- lane-b:120: [vwap-variable-missing-inputs-v53-v1.pine](vwap-variable-missing-inputs-v53-v1.pine)
- lane-b:121: [accdist-variable-missing-inputs-v53-v1.pine](accdist-variable-missing-inputs-v53-v1.pine)
