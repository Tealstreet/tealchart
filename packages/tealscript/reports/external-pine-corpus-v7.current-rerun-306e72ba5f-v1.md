# External Pine Corpus V7 Current Rerun

Generated: 2026-09-11T10:33:20.978Z

Baseline report: `.cache/tealscript/pine-corpus-v7-20260911/fixture-profiles-current-2e05553bda/external-pine-corpus-v7-daily-standard.json`
Baseline commit: `bbcbf3d22069bbddcce4a3a66c37821ac0fe33b4`

Current report: `reports/external-pine-corpus-v7.daily-rerun-306e72ba5f.json`
Current commit: `306e72ba5f22cd9d6b609ae7a699b7521f80ffa2`

The current v7 measurement is **304/400 achievable output**. The previous harvest measurement was **293/401** at `bbcbf3d220`, so the attributable movement is **+11 output rows** with the achievable denominator down by one.

This is not a clean +19 from the row-level handoff list. Seventeen rows that previously failed now produce output, and six formerly producing rows now correctly fail loudly. The construct-level implementation framing predicted the movement better than the raw nineteen-row queue: the landed fixes produced seventeen observable gains, two of the nine runtime-row handoffs were already green when the runtime lane remeasured, and TA-length rejection plus propagated Pine runtime limits removed six rows that had been counted as output by older behavior.

TA invalid-length drops are attributed to `67e6023355`, merged to parity by `39757006c2`; `39757006c2` is the commit named in `packages/tealscript/CLAUDE.md` for expected corpus output drops. The two table-limit drops are attributed to `1e52cd8518`. No v7 row in this before/after diff moved on the array-slice boundary from `3cbadb64dd`.

There is no additional movement between the earlier current rerun at `7c08371da1` and this rerun at `306e72ba5f`; both measure v7 at **304/400**.

## Figures

| Measurement | Commit | Raw output | Achievable output | Achievable denominator | Achievable % |
| --- | --- | --- | --- | --- | --- |
| baseline | bbcbf3d220 | 293/456 | 293 | 401 | 73.07% |
| current | 306e72ba5f | 304/456 | 304 | 400 | 76% |
| delta |  | +11 | +11 | -1 |  |

## Attribution

| Direction | Rows | Commit | Owner | Cause |
| --- | --- | --- | --- | --- |
| gain | 10 | 45879c94f3 | parser/semantic | v7 parser and semantic acceptance fixes |
| gain | 7 | d97a799a6f | runtime | matrix eigen complex-result handling |
| drop | 4 | 67e6023355 | runtime | invalid TA length now rejects |
| drop | 2 | 1e52cd8518 | runtime | Pine runtime boundary errors now propagate |

## Gains

| Row | Previous stage | Previous diagnostic | Commit | Cause |
| --- | --- | --- | --- | --- |
| sources/0100__TommyPang-TradingBot__pillar7_catalysts.pine | semantic | 27:50: type-mismatch: Invalid request.earnings field: earnings.future_time | 45879c94f3 | v7 parser and semantic acceptance fixes |
| sources/0101__DarthBuddha-TradingView__MoneyFlow.pine | parse | 29:9: Expected "/*", "//", [ \t], or [\n\r] but "O" found. | 45879c94f3 | v7 parser and semantic acceptance fixes |
| sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine | parse | 29:9: Expected "/*", "//", [ \t], or [\n\r] but "O" found. | 45879c94f3 | v7 parser and semantic acceptance fixes |
| sources/0115__agejevasv-tradingview__marketprofile.pine | parse | 104:18: Expected "#", "'", "(", ".", "/*", "[", "\"", "\"\"\"", "false", "for", "if", "na", "not", "switch", "true", ... | 45879c94f3 | v7 parser and semantic acceptance fixes |
| sources/0116__s4mn0v-pinescript__market-profile.pine | parse | 139:18: Expected "#", "'", "(", ".", "/*", "[", "\"", "\"\"\"", "false", "for", "if", "na", "not", "switch", "true", ... | 45879c94f3 | v7 parser and semantic acceptance fixes |
| sources/0141__pineforge-4pass-pineforge-corpus__strategy.pine | execute | Matrix eigenvalues are complex or QR iteration did not converge to real diagonal values | d97a799a6f | matrix eigen complex-result handling |
| sources/0142__MeridianAlgo-Pine-A-Script__Singular_Spectrum_Decomposition_LuxAlgo.pine | execute | Matrix eigenvalues are complex or QR iteration did not converge to real diagonal values | d97a799a6f | matrix eigen complex-result handling |
| sources/0143__pineforge-4pass-pineforge-benchmarks-assets__strategy.pine | execute | Matrix eigenvalues are complex or QR iteration did not converge to real diagonal values | d97a799a6f | matrix eigen complex-result handling |
| sources/0144__regalouisei-collect-tradingview__rolling-ssa-oscillator-luxalgo.pine | execute | Matrix eigenvalues are complex or QR iteration did not converge to real diagonal values | d97a799a6f | matrix eigen complex-result handling |
| sources/0145__pineforge-4pass-pineforge-codegen-oss__validation__matrix-eigen-rank-deficient-cov-01.pine | execute | Matrix eigenvalues are complex or QR iteration did not converge to real diagonal values | d97a799a6f | matrix eigen complex-result handling |
| sources/0146__helenananaa-pine-compat-runtime__matrix_eigenvalues.pine | execute | Matrix eigenvalues are complex and cannot be represented as real values | d97a799a6f | matrix eigen complex-result handling |
| sources/0160__helenananaa-pine-compat-runtime__matrix_eigenvectors.pine | execute | Matrix eigenvalues are complex and cannot be represented as real values | d97a799a6f | matrix eigen complex-result handling |
| sources/0243__ainell-owi-LePine__Siege-_structure-_engine_v6.pine | semantic | 372:40: unknown-identifier: Unknown identifier: found | 45879c94f3 | v7 parser and semantic acceptance fixes |
| sources/0411__deepentropy-lightweight-charts-indicators__TradingView-Alerts-Expo-.pine | semantic | 184:5: type-mismatch: Cannot assign float value to bool variable priceabovebelow | 45879c94f3 | v7 parser and semantic acceptance fixes |
| sources/0441__alboogycOdR-dev-projects__institutional_crt_frameworkv9.pine | semantic | 663:5: unknown-identifier: Unknown identifier: swept | 45879c94f3 | v7 parser and semantic acceptance fixes |
| sources/0442__alboogycOdR-dev-projects__institutional_crt_frameworkv8.1.pine | semantic | 660:5: unknown-identifier: Unknown identifier: swept | 45879c94f3 | v7 parser and semantic acceptance fixes |
| sources/0453__deepentropy-oakscriptJS__TradingView-Alerts-Expo-.pine | semantic | 184:5: type-mismatch: Cannot assign float value to bool variable priceabovebelow | 45879c94f3 | v7 parser and semantic acceptance fixes |

## Correct Drops

These drops are expected and should not be read as regressions. The TA-length rows relied on old silent coercion. The table rows now surface Pine runtime limits instead of leaving the boundary ambiguous.

| Row | Current stage | Current diagnostic | Commit | Cause |
| --- | --- | --- | --- | --- |
| sources/0252__regalouisei-collect-tradingview__short-volume-stamper.pine | execute | Too many table cells: maximum is 10000 | 1e52cd8518 | Pine runtime boundary errors now propagate |
| sources/0254__deepentropy-lightweight-charts-indicators__Global-Liquidity-Index.pine | execute | TA length must be a positive integer | 67e6023355 | invalid TA length now rejects |
| sources/0260__deepentropy-oakscriptJS__Global-Liquidity-Index.pine | execute | TA length must be a positive integer | 67e6023355 | invalid TA length now rejects |
| sources/0290__hasnocool-tradingview-pine-scripts__Position-Investing-by-SirSeff.pine | execute | TA length must be a positive integer | 67e6023355 | invalid TA length now rejects |
| sources/0367__himeshramjee-chaiwala-invest__two-thirty-100pip-scalp.pine | execute | Too many table cells: maximum is 10000 | 1e52cd8518 | Pine runtime boundary errors now propagate |
| sources/0380__etnt-stocks__15M.pine | execute | TA length must be a positive integer | 67e6023355 | invalid TA length now rejects |
