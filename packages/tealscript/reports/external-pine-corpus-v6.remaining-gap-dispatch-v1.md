> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V6 Remaining Gap Dispatch V1

Measurement commit: `94cae779898ba55e04e67df644e6025f7e281251` (archived from HEAD before the shared worktree advanced).
Corpus: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911`.
Stable recovered corpus path: `packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911`.
Manifest: `packages/tealscript/reports/external-pine-corpus-v6.manifest.json`.
Daily report: `packages/tealscript/reports/external-pine-corpus-v6-daily-standard.report.json`.
Context-stress report: `packages/tealscript/reports/external-pine-corpus-v6-context-stress.report.json`.
Method: fixed v6 corpus, pinned by repo/path/commit SHA/content hash, measured once under both calibrated fixture profiles. Rows failing on only one profile are chart-context-dependent.

Reproduction:

```bash
yarn workspace @tealstreet/tealscript tsx scripts/harvest-external-pine-corpus-v5.ts \
  --output .cache/tealscript/pine-corpus-v6-20260911 \
  --target 1000 \
  --exclude-v5 \
  --min-version 5 \
  --method github-code-search-v6-balanced \
  --max-kind strategy=300 \
  --max-kind library=100

yarn workspace @tealstreet/tealscript tsx scripts/measure-external-pine-corpus-fixture-profiles.ts \
  --input .cache/tealscript/pine-corpus-v6-20260911 \
  --cache-dir .cache/tealscript/pine-corpus-v6-20260911/fixture-profiles/94cae77989-v1 \
  --output reports/external-pine-corpus-v6.fixture-profile-delta-v1.md \
  --corpus-label v6 \
  --report-version v1
```

## Corpus

- Scripts: 1000; repositories: 328.
- Versions: {"5":511,"6":489}.
- Declarations: {"indicator":680,"library":20,"strategy":300}.
- Harvest method: `github-code-search-v6-balanced`; excluded source count: 2113.
- Source files are not committed; the committed manifest records SHA-256 hashes for recovery verification.

## Headline

- Daily profile: 716/938 achievable output (76.33%), raw output 716/1000 (71.6%), validity {"invalid-pine":26,"supported":771,"tealscript-gap":167,"unsupported-by-design":36}.
- Context-stress profile: 719/938 achievable output (76.65%), raw output 719/1000 (71.9%), validity {"invalid-pine":26,"supported":773,"tealscript-gap":165,"unsupported-by-design":36}.
- Current TealScript-gap rows across either profile: 168.
- Unconditional gaps on both profiles: 164.
- Chart-context-dependent gaps: 4.
- Known trace/host-required rows among current gaps: 15.
- Excluded unsupported-by-design rows: 36.
- Excluded invalid-Pine rows: 26.

## Ranked Root Causes

| Rank | Cause | Rows | Profiles | Trace/host-required |
| ---: | --- | ---: | --- | ---: |
| 1 | parse:unexpected-token | 50 | daily+context-stress | 0 |
| 2 | output:conditional-or-data-gated-output-not-triggered | 35 | daily+context-stress, daily-only | 0 |
| 3 | semantic:type-mismatch | 12 | daily+context-stress | 0 |
| 4 | semantic:unsupported-feature:strategy calc_on_order_fills trace-required | 7 | daily+context-stress | 7 |
| 5 | output:global-output-declared-but-not-evaluated | 6 | daily+context-stress | 0 |
| 6 | semantic:unsupported-feature:strategy fill_orders_on_standard_ohlc host-required | 6 | daily+context-stress | 6 |
| 7 | execute:runtime.error | 4 | daily+context-stress | 0 |
| 8 | execute:array-bounds-runtime-error | 3 | daily+context-stress, daily-only | 0 |
| 9 | execute:security-lower-tf-timeframe-refusal | 3 | daily+context-stress | 0 |
| 10 | semantic:argument-count | 3 | daily+context-stress | 0 |
| 11 | semantic:invalid-type-template | 3 | daily+context-stress | 0 |
| 12 | execute:array-size-limit | 2 | context-stress-only, daily+context-stress | 0 |
| 13 | semantic:unknown-identifier:_co_gbl_up | 2 | daily+context-stress | 0 |
| 14 | semantic:unknown-identifier:hPrice | 2 | daily+context-stress | 0 |
| 15 | semantic:unresolved-import | 2 | daily+context-stress | 0 |
| 16 | semantic:unsupported-feature:strategy risk_free_rate trace-required | 2 | daily+context-stress | 2 |
| 17 | execute:Cannot create an array with a negative size | 1 | daily+context-stress | 0 |
| 18 | execute:dynamic-request-local-scope | 1 | daily+context-stress | 0 |
| 19 | execute:Matrix power must be a non-negative integer | 1 | daily+context-stress | 0 |
| 20 | semantic:26:9: unknown-assignment-target: Cannot assign to undeclared identifi… | 1 | daily+context-stress | 0 |
| 21 | semantic:34:22: qualifier-mismatch: Cannot pass series value to simple paramet… | 1 | daily+context-stress | 0 |
| 22 | semantic:83:5: scope-mismatch: alertcondition() must be called from the global… | 1 | daily+context-stress | 0 |
| 23 | semantic:library-export | 1 | daily+context-stress | 0 |
| 24 | semantic:unknown-argument:hline.alpha | 1 | daily+context-stress | 0 |
| 25 | semantic:unknown-argument:indicator.margin_top | 1 | daily+context-stress | 0 |
| 26 | semantic:unknown-argument:label.new.bgcolor | 1 | daily+context-stress | 0 |
| 27 | semantic:unknown-argument:strategy.contract_size | 1 | daily+context-stress | 0 |
| 28 | semantic:unknown-argument:strategy.entry.when | 1 | daily+context-stress | 0 |
| 29 | semantic:unknown-function:polyline | 1 | daily+context-stress | 0 |
| 30 | semantic:unknown-function:runtime.log | 1 | daily+context-stress | 0 |
| 31 | semantic:unknown-identifier:cleanTicker | 1 | daily+context-stress | 0 |
| 32 | semantic:unknown-identifier:day | 1 | daily+context-stress | 0 |
| 33 | semantic:unknown-identifier:dayofyear | 1 | daily+context-stress | 0 |
| 34 | semantic:unknown-identifier:emaFast | 1 | daily+context-stress | 0 |
| 35 | semantic:unknown-identifier:error_log_level | 1 | daily+context-stress | 0 |
| 36 | semantic:unknown-identifier:macd_line | 1 | daily+context-stress | 0 |
| 37 | semantic:unknown-identifier:pi | 1 | daily+context-stress | 0 |
| 38 | semantic:unknown-identifier:positionValue | 1 | daily+context-stress | 0 |
| 39 | semantic:unknown-identifier:result | 1 | daily+context-stress | 0 |
| 40 | semantic:unknown-identifier:return | 1 | daily+context-stress | 0 |
| 41 | semantic:unknown-identifier:src | 1 | daily+context-stress | 0 |
| 42 | semantic:unknown-identifier:then | 1 | daily+context-stress | 0 |

## Chart-Context-Dependent Gaps

- `sources/0097__sancarhuseyin-standard-variation__codesample.pine` — v6 — indicator — context-stress-only — execute — execute:array-size-limit — `Array is too large. Maximum size is 100000`
- `sources/0339__deepentropy-oakscriptJS__ICT-Algorithmic-Macro-Tracker-Open-Source-by-toodegrees.pine` — v5 — indicator — daily-only — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0358__alboogycOdR-dev-projects__original.pine` — v5 — indicator — daily-only — execute — execute:array-bounds-runtime-error — `Array index 2 is out of bounds. Array size is 2`
- `sources/0415__skywalker0803r-Sentinel-System__SmartMoneyConcepts.pine` — v5 — indicator — daily-only — execute — execute:array-bounds-runtime-error — `Array index 2 is out of bounds. Array size is 2`

## Unconditional Gaps By Cause

### parse:unexpected-token (50)

- `sources/0144__regalouisei-collect-tradingview__superrsi-enhanced-momentum.pine` — v6 — indicator — daily+context-stress — parse — parse:unexpected-token — `38:1: Expected "/*", "//", [ \t], or [\n\r] but "e" found.`
- `sources/0188__trsdn-meta-strategy__ai-rsi.pine` — v5 — strategy — daily+context-stress — parse — parse:unexpected-token — `1:55: Expected "/*", [ \t], or [0-9] but "\n" found.`
- `sources/0189__trsdn-meta-strategy__ai-macd.pine` — v5 — strategy — daily+context-stress — parse — parse:unexpected-token — `1:55: Expected "/*", [ \t], or [0-9] but "\n" found.`
- `sources/0270__g-moe-Trading-Indicators__csw-sentiment-line.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `11:119: Expected "\"" or "\\" but "\n" found.`
- `sources/0293__regalouisei-collect-tradingview__trendflex-oscillator-dr-john-ehlers.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `23:13: Expected "/*", "=", "in", or [ \t] but "i" found.`
- `sources/0302__regalouisei-collect-tradingview__oscillator-workbench-chart-lucf.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `134:96: Expected "\"" or "\\" but "\n" found.`
- `sources/0335__itmakesyousick-HTF-Candles-Pivots__Next.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `567:122: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.`
- `sources/0357__webcrack4-pine-script-combine__V5_14-16-21-27-34-35-36.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `959:17: Expected "/*", "=", "in", or [ \t] but "i" found.`
- `sources/0382__helenananaa-pine-compat-runtime__user_methods.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `229:33: Expected "(", ")", ",", ".", "/*", "//", "<", "=", "[", [ \t], or [\n\r] but "p" found.`
- `sources/0410__AubakirovArman-SaltanatbotV2__4-fundamentals-graphing.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `670:27: Expected "/*", "=", or [ \t] but "." found.`
- `sources/0423__regalouisei-collect-tradingview__monte-carlo-polyline-traceback-kioseff-trading.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `85:30: Expected ".", "/*", "[", "[]", or [ \t] but "\n" found.`
- `sources/0442__helenananaa-pine-compat-runtime__user_type_array_scalar_tree_helpers.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `45:10: Expected "/*", "=", "in", or [ \t] but "," found.`
- `sources/0461__deepentropy-lightweight-charts-indicators__Realtime-Footprint.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `241:5: Expected "#", "'", "(", ".", "/*", "//", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix"…`
- `sources/0469__g-moe-Trading-Indicators__csw-technical-analysis-beta.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `11:103: Expected "\"" or "\\" but "\n" found.`
- `sources/0485__itmakesyousick-Currency-Strength-Chart__v33.0.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `509:142: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.`
- `sources/0486__alboogycOdR-dev-projects__institutional_crt_frameworkv8.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `489:47: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.`
- `sources/0491__alboogycOdR-dev-projects__WED-MIDNIGHT-DST-System-v0.8.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `609:39: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "=" found.`
- `sources/0496__alboogycOdR-dev-projects__v0.7.0-0801DST_ALERTS-V0.7.0.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `409:57: Expected "(", ")", ",", ".", "/*", "//", "<", "[", [ \t], or [\n\r] but "s" found.`
- `sources/0520__quant5-lab-runner__test-switch-indent-3case-7body.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `6:8: Expected "/*", "//", [ \t], or [\n\r] but "5" found.`
- `sources/0551__Electrified-Trading-Indicators__MACD-Duo.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `68:8: Expected "(", ".", "/*", "//", "<", "[", [ \t], or [\n\r] but "=" found.`
- `sources/0556__g-moe-Trading-Indicators__supply-demand-zones-linear-regression-v3.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `40:123: Expected "\"" or "\\" but "\n" found.`
- `sources/0562__deepentropy-oakscriptJS__Realtime-Footprint.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `241:5: Expected "#", "'", "(", ".", "/*", "//", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix"…`
- `sources/0616__g-moe-Trading-Indicators__csw-internals-pro.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `11:142: Expected "\"" or "\\" but "\n" found.`
- `sources/0642__itmakesyousick-Currency-Strength-Chart__v39.0.pine` — v5 — indicator — daily+context-stress — parse — parse:unexpected-token — `298:115: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.`
- `sources/0817__trustdan-trend-following-backtesting-strategies__seykota_alt46_sector_adaptive_parameters.pine` — v6 — strategy — daily+context-stress — parse — parse:unexpected-token — `81:54: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.`
- `sources/0822__trustdan-trend-following-backtesting-strategies__seykota_alt45_dual_momentum_confirmation.pine` — v6 — strategy — daily+context-stress — parse — parse:unexpected-token — `83:54: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.`
- `sources/0823__trustdan-trend-following-backtesting-strategies__seykota_alt43_volatility_adaptive_targets.pine` — v6 — strategy — daily+context-stress — parse — parse:unexpected-token — `80:54: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.`
- `sources/0825__trustdan-trend-following-backtesting-strategies__seykota_alt43_volatility_adaptive_targets.pine` — v6 — strategy — daily+context-stress — parse — parse:unexpected-token — `80:54: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.`
- `sources/0845__raybird-pine-trading-strategies__TnSovereignScalpingProV6.pine` — v6 — strategy — daily+context-stress — parse — parse:unexpected-token — `60:13: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "ma…`
- `sources/0872__trustdan-trend-following-backtesting-strategies__alt39.pine` — v6 — strategy — daily+context-stress — parse — parse:unexpected-token — `69:54: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.`
- `sources/0883__raybird-pine-trading-strategies__TnSovereignGapFillOpeningRangeV6.pine` — v6 — strategy — daily+context-stress — parse — parse:unexpected-token — `67:15: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "else", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "m…`
- `sources/0885__trustdan-trend-following-backtesting-strategies__seykota_alt45_dual_momentum_confirmation.pine` — v6 — strategy — daily+context-stress — parse — parse:unexpected-token — `83:54: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.`
- `sources/0889__trustdan-trend-following-backtesting-strategies__seykota_alt45_dual_momentum_confirmation.pine` — v6 — strategy — daily+context-stress — parse — parse:unexpected-token — `83:54: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.`
- `sources/0910__raybird-pine-trading-strategies__TnSovereignReversalEngineV6.pine` — v6 — strategy — daily+context-stress — parse — parse:unexpected-token — `67:34: Expected "#", "'", "(", ".", "/*", "//", "[", "\"", "\"\"\"", "false", "na", "not", "true", [ \t], [+\-], [0-9], or [\n\r] but "|" found.`
- `sources/0912__raybird-pine-trading-strategies__TnSovereignHFTEngineV6.pine` — v6 — strategy — daily+context-stress — parse — parse:unexpected-token — `60:19: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "ma…`
- `sources/0936__trustdan-trend-following-backtesting-strategies__alt39.pine` — v6 — strategy — daily+context-stress — parse — parse:unexpected-token — `69:54: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.`
- `sources/0956__trustdan-trend-following-backtesting-strategies__06_PF-1.338_SPY_seykota_alt36_breakeven_momentum.pine` — v6 — strategy — daily+context-stress — parse — parse:unexpected-token — `65:54: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.`
- `sources/0969__trustdan-trend-following-backtesting-strategies__seykota_alt46_sector_adaptive_parameters.pine` — v6 — strategy — daily+context-stress — parse — parse:unexpected-token — `81:54: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.`
- `sources/0975__trustdan-trend-following-backtesting-strategies__seykota_alt43_volatility_adaptive_targets.pine` — v6 — strategy — daily+context-stress — parse — parse:unexpected-token — `80:54: Expected "%=", "*=", "+=", "-=", ".", "/*", "/=", ":=", "[", or [ \t] but "(" found.`
- `sources/0982__deepentropy-lightweight-charts-indicators__RelativeValue-v3.pine` — v6 — library — daily+context-stress — parse — parse:unexpected-token — `150:120: Expected "\"" or "\\" but "\n" found.`
- `sources/0983__deepentropy-lightweight-charts-indicators__TechnicalRating-v3.pine` — v6 — library — daily+context-stress — parse — parse:unexpected-token — `93:16: Expected "(", ")", ",", ".", "/*", "//", "<", "[", [ \t], or [\n\r] but "7" found.`
- `sources/0988__deepentropy-lightweight-charts-indicators__ValueAtTime-v2.pine` — v6 — library — daily+context-stress — parse — parse:unexpected-token — `114:49: Expected "\"" or "\\" but "\n" found.`
- `sources/0990__deepentropy-oakscriptJS__RiskMetrics-v3.pine` — v6 — library — daily+context-stress — parse — parse:unexpected-token — `133:7: Expected "/*", "[", "array", "bool", "color", "const", "enum", "float", "input", "int", "map", "matrix", "method", "overload", "series", "simple", "string", "type", "var", "varip", or [ \t] but " " found.`
- `sources/0991__deepentropy-oakscriptJS__RelativeValue-v4.pine` — v6 — library — daily+context-stress — parse — parse:unexpected-token — `72:7: Expected "/*", "[", "array", "bool", "color", "const", "enum", "float", "input", "int", "map", "matrix", "method", "overload", "series", "simple", "string", "type", "var", "varip", or [ \t] but " " found.`
- `sources/0992__deepentropy-oakscriptJS__TechnicalRating-v3.pine` — v6 — library — daily+context-stress — parse — parse:unexpected-token — `15:7: Expected ".", "/*", "[", "[]", [ \t], or [A-Za-z0-9_\-] but " " found.`
- `sources/0993__deepentropy-oakscriptJS__ta-v12.pine` — v6 — library — daily+context-stress — parse — parse:unexpected-token — `249:7: Expected "/*", "[", "array", "bool", "color", "const", "enum", "float", "input", "int", "map", "matrix", "method", "overload", "series", "simple", "string", "type", "var", "varip", or [ \t] but " " found.`
- `sources/0994__deepentropy-oakscriptJS__ZigZag-v9.pine` — v6 — library — daily+context-stress — parse — parse:unexpected-token — `29:7: Expected "/*", "[", "array", "bool", "color", "const", "enum", "float", "input", "int", "map", "matrix", "method", "overload", "series", "simple", "string", "type", "var", "varip", or [ \t] but " " found.`
- `sources/0995__deepentropy-oakscriptJS__LibraryCOT-v5.pine` — v6 — library — daily+context-stress — parse — parse:unexpected-token — `102:38: Expected "(", ")", ",", ".", "/*", "//", "<", "=", "[", "[]", [ \t], or [\n\r] but " " found.`
- `sources/0996__deepentropy-oakscriptJS__Strategy-v5.pine` — v6 — library — daily+context-stress — parse — parse:unexpected-token — `27:7: Expected "/*", "[", "array", "bool", "color", "const", "enum", "float", "input", "int", "map", "matrix", "method", "overload", "series", "simple", "string", "type", "var", "varip", or [ \t] but " " found.`
- `sources/0999__deepentropy-oakscriptJS__Request-v3.pine` — v6 — library — daily+context-stress — parse — parse:unexpected-token — `115:7: Expected "/*", "[", "array", "bool", "color", "const", "enum", "float", "input", "int", "map", "matrix", "method", "overload", "series", "simple", "string", "type", "var", "varip", or [ \t] but " " found.`

### output:conditional-or-data-gated-output-not-triggered (34)

- `sources/0219__utamons-pine__levels.pine` — v5 — indicator — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0231__BrandonFreire-Prj_ML_VisualizacionDeDatosMedianteMotorDeCharting__06_Mxwll_Suite_3.pine` — v5 — indicator — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0367__regalouisei-collect-tradingview__3d-engine-overlay.pine` — v5 — indicator — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0473__quant5-lab-runner__support_resistance_pivot_levels.pine` — v5 — indicator — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0547__BeSmMo-pinescript2__Multi-Supertrend.pine` — v5 — indicator — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0568__lucanenu-cpu-ai-trading-bot-2__signal_visualizer.pine` — v5 — indicator — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0577__deepentropy-lightweight-charts-indicators__Breakouts-with-Tests-Retests-LuxAlgo-.pine` — v5 — indicator — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0578__deepentropy-oakscriptJS__Breakouts-with-Tests-Retests-LuxAlgo-.pine` — v5 — indicator — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0623__AubakirovArman-SaltanatbotV2__5-ict-killzones-pivots.pine` — v5 — indicator — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0699__studiomicro-strategies__bullish_engulfing.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0717__dipayansamanta172-lgtm-tradingbot__main.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0719__SynergOps-AlgoTrading__backtesting-stream.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0731__alireza-hme-algo-trading__HW1-strategy.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0767__agentiayoung-agent-trader-framework__range_breakout.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0807__pineforge-4pass-pineforge-corpus__strategy.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0809__pineforge-4pass-pineforge-corpus__strategy.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0819__pineforge-4pass-pineforge-benchmarks-assets__strategy.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0855__pineforge-4pass-pineforge-codegen-oss__validation__pyramid-close-id-grouping-01.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0858__deepentropy-lightweight-charts-indicators__Momentum-Strategy.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0880__pineforge-4pass-pineforge-corpus__strategy.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0917__pineforge-4pass-pineforge-codegen-oss__QQQ__session-ispremarket-nasdaq-01.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0919__pineforge-4pass-pineforge-codegen-oss__validation__order-dual-stop-near-only-01.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0922__pineforge-4pass-pineforge-codegen-oss__validation__order-cross-exit-close-same-pass-01.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0923__pineforge-4pass-pineforge-codegen-oss__validation__order-cross-entry-close-same-pass-01.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0924__pineforge-4pass-pineforge-codegen-oss__validation__cap-risk-gates-allow-max-intraday-01.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0926__pineforge-4pass-pineforge-codegen-oss__validation__order-stop-entry-reversal-grouping-01.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0927__pineforge-4pass-pineforge-codegen-oss__validation__order-dual-stop-open-high-first-path-01.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0928__pineforge-4pass-pineforge-codegen-oss__validation__analyzer-parity-percent-of-equity-sizing-01.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0935__deepentropy-oakscriptJS__Momentum-Strategy.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0946__pineforge-4pass-pineforge-corpus__strategy.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0951__pineforge-4pass-pineforge-corpus__strategy.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0965__pineforge-4pass-pineforge-benchmarks-assets__strategy.pine` — v6 — strategy — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0981__deepentropy-lightweight-charts-indicators__getSeries-v2.pine` — v6 — library — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`
- `sources/0984__deepentropy-lightweight-charts-indicators__ZigZag-v8.pine` — v6 — library — daily+context-stress — output — output:conditional-or-data-gated-output-not-triggered — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript…`

### semantic:type-mismatch (12)

- `sources/0086__folknor-pine-tools__INV183-plain-param-expected-noun.pine` — v6 — indicator — daily+context-stress — semantic — semantic:type-mismatch — `11:23: type-mismatch: ta.highest length must be a number, got string`
- `sources/0087__folknor-pine-tools__INV184-format-tail-poisoned-call.pine` — v6 — indicator — daily+context-stress — semantic — semantic:type-mismatch — `13:38: type-mismatch: na x cannot be a boolean`
- `sources/0163__folknor-pine-tools__INV182-user-variable-qualifier.pine` — v6 — indicator — daily+context-stress — semantic — semantic:type-mismatch — `25:17: type-mismatch: str.length source must be a string, got float`
- `sources/0223__DemasJ2k-Strategies-Indicators__flowrex_tradingview_indicator.pine` — v5 — indicator — daily+context-stress — semantic — semantic:type-mismatch — `33:15: type-mismatch: Cannot use float value as int array element`
- `sources/0284__jfernandogg-pinescript_ind_estrat__stock_valuation_matrix.pine` — v5 — indicator — daily+context-stress — semantic — semantic:type-mismatch — `62:35: type-mismatch: Invalid table.new position: position.middle`
- `sources/0376__helenananaa-pine-compat-runtime__unsupported_array_set_mixed_udt.pine` — v5 — indicator — daily+context-stress — semantic — semantic:type-mismatch — `10:22: type-mismatch: Cannot use udt value as udt array element`
- `sources/0440__helenananaa-pine-compat-runtime__unsupported_array_unshift_udt_method.pine` — v5 — indicator — daily+context-stress — semantic — semantic:type-mismatch — `9:16: type-mismatch: Cannot use udt value as udt array element`
- `sources/0617__caizongxun-bb-channel-ai-predictor__bb_predictor_final.pine` — v5 — indicator — daily+context-stress — semantic — semantic:type-mismatch — `62:133: type-mismatch: Invalid plot style: plot.style_dashed`
- `sources/0674__helenananaa-pine-compat-runtime__unsupported_array_insert_udt_method.pine` — v5 — indicator — daily+context-stress — semantic — semantic:type-mismatch — `9:18: type-mismatch: Cannot use udt value as udt array element`
- `sources/0737__zelosleone-pinescript-vsc-server-rust__subtle_logic_error_suite.pine` — v6 — strategy — daily+context-stress — semantic — semantic:type-mismatch — `22:5: type-mismatch: strategy.exit requires a limit, stop, profit, loss, or trailing stop price`
- `sources/0846__Borisder1-skalpel__SMC_Agent_v6.pine` — v6 — strategy — daily+context-stress — semantic — semantic:type-mismatch — `569:5: type-mismatch: Cannot assign chart.point value to float variable 'yBreak'`
- `sources/0848__Finnlayy-ai_trading_jules_prompt_pack__Top1_HYPEUSDT_GA_CrossAlgo_Optimized.pine` — v6 — strategy — daily+context-stress — semantic — semantic:type-mismatch — `162:15: type-mismatch: input.float defval must be greater than or equal to minval`

### semantic:unsupported-feature:strategy calc_on_order_fills trace-required (7)

- `sources/0712__WaleA-Dev-wale-pinescript-engine__new.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unsupported-feature:strategy calc_on_order_fills trace-required — `8:26: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it`
- `sources/0718__Chioma-Nwankwo-Works__Pure_Price_Action.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unsupported-feature:strategy calc_on_order_fills trace-required — `10:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it`
- `sources/0746__iamrichardD-tradingview__strategy-v1.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unsupported-feature:strategy calc_on_order_fills trace-required — `19:67: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it`
- `sources/0783__mush-dna-pinescript-vscode-extension__mysample.v6.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unsupported-feature:strategy calc_on_order_fills trace-required — `2:97: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it`
- `sources/0894__wesso80-marketscannerpros__MSP_Day_Trader_v2_AL.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unsupported-feature:strategy calc_on_order_fills trace-required — `21:26: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it`
- `sources/0897__vinay-veerappa-tvDownloadOHLC__orb_v6_tanja_trend.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unsupported-feature:strategy calc_on_order_fills trace-required — `9:31: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it`
- `sources/0966__eddoonn-Wickless-candle__Wickless_Reversal_Strategy_v1_0.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unsupported-feature:strategy calc_on_order_fills trace-required — `15:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it`

### output:global-output-declared-but-not-evaluated (6)

- `sources/0251__quant5-lab-runner__08b_positive_simple.pine` — v5 — indicator — daily+context-stress — output — output:global-output-declared-but-not-evaluated — `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.`
- `sources/0276__nathanssantos-marketmind__cumulative-rsi-r3.pine` — v5 — indicator — daily+context-stress — output — output:global-output-declared-but-not-evaluated — `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.`
- `sources/0329__nathanssantos-marketmind__breakout-retest.pine` — v5 — indicator — daily+context-stress — output — output:global-output-declared-but-not-evaluated — `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.`
- `sources/0331__nathanssantos-marketmind__parabolic-sar-crypto.pine` — v5 — indicator — daily+context-stress — output — output:global-output-declared-but-not-evaluated — `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.`
- `sources/0394__nathanssantos-marketmind__range-breakout.pine` — v5 — indicator — daily+context-stress — output — output:global-output-declared-but-not-evaluated — `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.`
- `sources/0609__nathanssantos-marketmind__connors-rsi2-original.pine` — v5 — indicator — daily+context-stress — output — output:global-output-declared-but-not-evaluated — `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.`

### semantic:unsupported-feature:strategy fill_orders_on_standard_ohlc host-required (6)

- `sources/0706__equitymarkets-pine_script_quant_trading__EA_2.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unsupported-feature:strategy fill_orders_on_standard_ohlc host-required — `4:63: unsupported-feature: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for non-standard charts before TealScript can simulate it`
- `sources/0710__JoelPasapera-Strategies-in-Pine-Script-v6__Ultra-simple-strategy.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unsupported-feature:strategy fill_orders_on_standard_ohlc host-required — `5:73: unsupported-feature: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for non-standard charts before TealScript can simulate it`
- `sources/0745__Hugs-4-Bugs-Trading-Indicator__Simple-Strategy.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unsupported-feature:strategy fill_orders_on_standard_ohlc host-required — `7:74: unsupported-feature: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for non-standard charts before TealScript can simulate it`
- `sources/0772__YooooungLee-clever-meme__.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unsupported-feature:strategy fill_orders_on_standard_ohlc host-required — `2:66: unsupported-feature: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for non-standard charts before TealScript can simulate it`
- `sources/0773__atanasvasilevjourney-trading-engine__strategy_template.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unsupported-feature:strategy fill_orders_on_standard_ohlc host-required — `7:36: unsupported-feature: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for non-standard charts before TealScript can simulate it`
- `sources/0821__JoelPasapera-Strategies-in-Pine-Script-v6__time_and_schedule.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unsupported-feature:strategy fill_orders_on_standard_ohlc host-required — `9:76: unsupported-feature: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for non-standard charts before TealScript can simulate it`

### execute:runtime.error (4)

- `sources/0129__woodstock-tokyo-pinescription-demo__example2.pine` — v6 — indicator — daily+context-stress — execute — execute:runtime.error — `runtime.error: Unknown argument 'text_color' for method cell`
- `sources/0408__g-moe-Trading-Indicators__price-action-candles-macd-signals.pine` — v5 — indicator — daily+context-stress — execute — execute:runtime.error — `30:1: runtime.error: The max timeframe allowed is 15 minutes.`
- `sources/0636__eddiebelaval-openclaw-tradingview__strategy-pack-by-cryptokazancev.pine` — v5 — indicator — daily+context-stress — execute — execute:runtime.error — `637:1: runtime.error: Not enough data to calculate Pivot Points. Lower the Pivots Timeframe in the indicator settings.`
- `sources/0645__regalouisei-collect-tradingview__strategy-pack-by-cryptokazancev.pine` — v5 — indicator — daily+context-stress — execute — execute:runtime.error — `637:1: runtime.error: Not enough data to calculate Pivot Points. Lower the Pivots Timeframe in the indicator settings.`

### execute:array-bounds-runtime-error (1)

- `sources/0680__helenananaa-pine-compat-runtime__unsupported_object_array_typed_udf_param_mismatch.pine` — v5 — indicator — daily+context-stress — execute — execute:array-bounds-runtime-error — `Array index 0 is out of bounds. Array size is 0`

### execute:security-lower-tf-timeframe-refusal (3)

- `sources/0266__deepentropy-oakscriptJS__Supply-and-Demand-Daily-LuxAlgo-.pine` — v5 — indicator — daily+context-stress — execute — execute:security-lower-tf-timeframe-refusal — `runtime.error: request.security_lower_tf requires a lower timeframe than the chart timeframe: 60`
- `sources/0615__sogutemir-PineScriptTradingViewIndicators__table.pine` — v5 — indicator — daily+context-stress — execute — execute:security-lower-tf-timeframe-refusal — `runtime.error: request.security_lower_tf requires a lower timeframe than the chart timeframe: 60`
- `sources/0849__Kelly-ux-The-Ultimate-Trading-Strategy-001__Msnr_1.pine` — v6 — strategy — daily+context-stress — execute — execute:security-lower-tf-timeframe-refusal — `runtime.error: request.security_lower_tf requires a lower timeframe than the chart timeframe: 60`

### semantic:argument-count (3)

- `sources/0085__danielbodnar-skills__basic-usage.pine` — v6 — indicator — daily+context-stress — semantic — semantic:argument-count — `68:33: argument-count: ta.vwma() expects at most 2 arguments`
- `sources/0208__cetio-indicators__vptl.pine` — v5 — indicator — daily+context-stress — semantic — semantic:argument-count — `14:27: argument-count: ta.ao() expects at most 0 arguments`
- `sources/0648__hcindus-AOS-Brain__CRYPTONIO_190POINT_CONFLUENCE_INDICATOR.pine` — v5 — indicator — daily+context-stress — semantic — semantic:argument-count — `59:26: argument-count: ta.pivothigh() expects at least 2 arguments`

### semantic:invalid-type-template (3)

- `sources/0436__helenananaa-pine-compat-runtime__unsupported_array_concat_map.pine` — v5 — indicator — daily+context-stress — semantic — semantic:invalid-type-template — `3:8: invalid-type-template: Invalid array element type 'map'; collection template types must include their element templates`
- `sources/0512__helenananaa-pine-compat-runtime__unsupported_array_concat_matrix.pine` — v5 — indicator — daily+context-stress — semantic — semantic:invalid-type-template — `3:8: invalid-type-template: Invalid array element type 'matrix'; collection template types must include their element templates`
- `sources/0585__helenananaa-pine-compat-runtime__unsupported_array_slice_matrix.pine` — v5 — indicator — daily+context-stress — semantic — semantic:invalid-type-template — `3:10: invalid-type-template: Invalid array element type 'matrix'; collection template types must include their element templates`

### execute:array-size-limit (1)

- `sources/0670__helenananaa-pine-compat-runtime__array_unshift_limit.pine` — v5 — indicator — daily+context-stress — execute — execute:array-size-limit — `Array is too large. Maximum size is 100000`

### semantic:unknown-identifier:_co_gbl_up (2)

- `sources/0336__munlit-FxMarketSession-MarketStructureOsc-ZeroLag-Vidya-AiMfi-Adx-xTsi-xMtPanel__ZeroLag-Trend-Levels.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unknown-identifier:_co_gbl_up — `22:22: unknown-identifier: Unknown identifier: _co_gbl_up`
- `sources/0621__munlit-FxMarketSession-MarketStructureOsc-ZeroLag-Vidya-AiMfi-Adx-xTsi-xMtPanel__Volumatic-Vidya.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unknown-identifier:_co_gbl_up — `21:27: unknown-identifier: Unknown identifier: _co_gbl_up`

### semantic:unknown-identifier:hPrice (2)

- `sources/0299__alboogycOdR-dev-projects__0729DST.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unknown-identifier:hPrice — `369:41: unknown-identifier: Unknown identifier: hPrice`
- `sources/0569__alboogycOdR-dev-projects__0729DST.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unknown-identifier:hPrice — `369:41: unknown-identifier: Unknown identifier: hPrice`

### semantic:unresolved-import (2)

- `sources/0483__regalouisei-collect-tradingview__technical-ratings.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unresolved-import — `15:1: unresolved-import: Official TradingView library 'TradingView/TechnicalRating' version 1 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import`
- `sources/0985__deepentropy-lightweight-charts-indicators__ta-v10.pine` — v6 — library — daily+context-stress — semantic — semantic:unresolved-import — `15:1: unresolved-import: Official TradingView library 'TradingView/RelativeValue' version 3 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import`

### semantic:unsupported-feature:strategy risk_free_rate trace-required (2)

- `sources/0758__LordGhostX-dex-market-maker__lighthouse.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unsupported-feature:strategy risk_free_rate trace-required — `6:21: unsupported-feature: strategy risk_free_rate=0 requires TradingView Sharpe/Sortino report trace parity before TealScript can simulate it`
- `sources/0901__Studentcodee-Coursework-technical-analysis__adaptive_strategy.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unsupported-feature:strategy risk_free_rate trace-required — `10:25: unsupported-feature: strategy risk_free_rate=0 requires TradingView Sharpe/Sortino report trace parity before TealScript can simulate it`

### execute:Cannot create an array with a negative size (1)

- `sources/0202__ak2k2-Custom-AAVWAP-Pinescript__v1-source.pine` — v5 — indicator — daily+context-stress — execute — execute:Cannot create an array with a negative size — `Cannot create an array with a negative size`

### execute:dynamic-request-local-scope (1)

- `sources/0363__regalouisei-collect-tradingview__long-term-capitulation-oscillator-ltco-diodato-2019.pine` — v5 — indicator — daily+context-stress — execute — execute:dynamic-request-local-scope — `runtime.error: request.* calls in local scopes require dynamic_requests=true: request.security`

### execute:Matrix power must be a non-negative integer (1)

- `sources/0168__helenananaa-pine-compat-runtime__matrix_call_result_pow_negative_power.pine` — v6 — indicator — daily+context-stress — execute — execute:Matrix power must be a non-negative integer — `Matrix power must be a non-negative integer`

### semantic:26:9: unknown-assignment-target: Cannot assign to undeclared identifi… (1)

- `sources/0185__TraderOracle-TradingView__Volume-Imbalances.pine` — v5 — indicator — daily+context-stress — semantic — semantic:26:9: unknown-assignment-target: Cannot assign to undeclared identifi… — `26:9: unknown-assignment-target: Cannot assign to undeclared identifier: gapRed`

### semantic:34:22: qualifier-mismatch: Cannot pass series value to simple paramet… (1)

- `sources/0194__gorx1-TradingView__quick_scan_for_drift.pine` — v5 — indicator — daily+context-stress — semantic — semantic:34:22: qualifier-mismatch: Cannot pass series value to simple paramet… — `34:22: qualifier-mismatch: Cannot pass series value to simple parameter 'len' for function qsfd; use an input/simple value or declare a compatible parameter`

### semantic:83:5: scope-mismatch: alertcondition() must be called from the global… (1)

- `sources/0596__mitchell-917-tradingview-pinescript-lab__rsi-basic-indicator.pine` — v5 — indicator — daily+context-stress — semantic — semantic:83:5: scope-mismatch: alertcondition() must be called from the global… — `83:5: scope-mismatch: alertcondition() must be called from the global scope; move the call out of the local block`

### semantic:library-export (1)

- `sources/1000__jonathan-nascimento51-tradeCripto2025__style_lib.pine` — v6 — library — daily+context-stress — semantic — semantic:library-export — `5:38: library-export: Exported constants must be literal values or compatible built-in variables`

### semantic:unknown-argument:hline.alpha (1)

- `sources/0117__mushroom-men-Trading-clean-litter__wave-trend-j-oscillator.pine` — v6 — indicator — daily+context-stress — semantic — semantic:unknown-argument:hline.alpha — `66:78: unknown-argument: Unknown argument 'alpha' for hline()`

### semantic:unknown-argument:indicator.margin_top (1)

- `sources/0281__fercreek-vigil__Zenith_Suite_V12.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unknown-argument:indicator.margin_top — `2:80: unknown-argument: Unknown argument 'margin_top' for indicator()`

### semantic:unknown-argument:label.new.bgcolor (1)

- `sources/0631__Alaamo7-pine-script-indicators__046-swing-trader-template-smart-egx-v2-3.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unknown-argument:label.new.bgcolor — `74:191: unknown-argument: Unknown argument 'bgcolor' for label.new()`

### semantic:unknown-argument:strategy.contract_size (1)

- `sources/0816__Young666YHF-xauusd_backtest__dollar_trader_martingale_adx.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unknown-argument:strategy.contract_size — `20:24: unknown-argument: Unknown argument 'contract_size' for strategy()`

### semantic:unknown-argument:strategy.entry.when (1)

- `sources/0931__helenananaa-pine-compat-runtime__unsupported_strategy_entry_when_v6.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unknown-argument:strategy.entry.when — `4:47: unknown-argument: Unknown argument 'when' for strategy.entry()`

### semantic:unknown-function:polyline (1)

- `sources/0434__helenananaa-pine-compat-runtime__polyline_cast.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unknown-function:polyline — `6:11: unknown-function: Unknown function: polyline`

### semantic:unknown-function:runtime.log (1)

- `sources/0903__raybird-pine-trading-strategies__adaptive_vol_regime_sovereign_v6.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unknown-function:runtime.log — `56:9: unknown-function: Unknown function: runtime.log`

### semantic:unknown-identifier:cleanTicker (1)

- `sources/0422__Hugs-4-Bugs-Trading-Indicator__Candle-Percent-Volatility-Alorse-.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unknown-identifier:cleanTicker — `14:26: unknown-identifier: Unknown identifier: cleanTicker`

### semantic:unknown-identifier:day (1)

- `sources/0908__raybird-pine-trading-strategies__tn_fakeout_sovereign_v6.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unknown-identifier:day — `114:97: unknown-identifier: Unknown identifier: day`

### semantic:unknown-identifier:dayofyear (1)

- `sources/0977__Jarvis-jpg-flask-trading-bot__jarvis_trading_strategy_LIVE.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unknown-identifier:dayofyear — `246:4: unknown-identifier: Unknown identifier: dayofyear`

### semantic:unknown-identifier:emaFast (1)

- `sources/0332__nathanssantos-marketmind__triple-ema-confluence.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unknown-identifier:emaFast — `23:25: unknown-identifier: Unknown identifier: emaFast`

### semantic:unknown-identifier:error_log_level (1)

- `sources/0343__luckyJeffy-pinescript-harmonic-detector__harmonic_patterns.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unknown-identifier:error_log_level — `337:8: unknown-identifier: Unknown identifier: error_log_level`

### semantic:unknown-identifier:macd_line (1)

- `sources/0728__lumduan-tradingview_tfex_usdthb__s50_scalping.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unknown-identifier:macd_line — `30:1: unknown-identifier: Unknown identifier: macd_line`

### semantic:unknown-identifier:pi (1)

- `sources/0193__jawauntb-trading-scripts__option-price-estimator.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unknown-identifier:pi — `20:19: unknown-identifier: Unknown identifier: pi`

### semantic:unknown-identifier:positionValue (1)

- `sources/0742__penguin72487-tradebot__HullTakerQ.pine` — v6 — strategy — daily+context-stress — semantic — semantic:unknown-identifier:positionValue — `44:6: unknown-identifier: Unknown identifier: positionValue`

### semantic:unknown-identifier:result (1)

- `sources/0310__quant5-lab-runner__test_for_simple.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unknown-identifier:result — `7:5: unknown-identifier: Unknown identifier: result`

### semantic:unknown-identifier:return (1)

- `sources/0628__alboogycOdR-dev-projects__DanielM_SnR_Optimized.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unknown-identifier:return — `82:9: unknown-identifier: Unknown identifier: return`

### semantic:unknown-identifier:src (1)

- `sources/0181__TraderOracle-TradingView__RSI-Cloud.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unknown-identifier:src — `14:13: unknown-identifier: Unknown identifier: src`

### semantic:unknown-identifier:then (1)

- `sources/0560__shevateshubham-tradingbot__smc_connector.pine` — v5 — indicator — daily+context-stress — semantic — semantic:unknown-identifier:then — `237:25: unknown-identifier: Unknown identifier: then`

## Profile-Specific Gap Details

### sources/0097__sancarhuseyin-standard-variation__codesample.pine

- Daily: supported | pass | produced-output-compiled | Pipeline reached visible output.
- Context-stress: tealscript-gap | execute | failed | Array is too large. Maximum size is 100000

### sources/0339__deepentropy-oakscriptJS__ICT-Algorithmic-Macro-Tracker-Open-Source-by-toodegrees.pine

- Daily: tealscript-gap | output | no-output-compiled | output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either syn…
- Context-stress: supported | pass | produced-output-compiled | Pipeline reached visible output.

### sources/0358__alboogycOdR-dev-projects__original.pine

- Daily: tealscript-gap | execute | failed | Array index 2 is out of bounds. Array size is 2
- Context-stress: supported | pass | produced-output-compiled | Pipeline reached visible output.

### sources/0415__skywalker0803r-Sentinel-System__SmartMoneyConcepts.pine

- Daily: tealscript-gap | execute | failed | Array index 2 is out of bounds. Array size is 2
- Context-stress: supported | pass | produced-output-compiled | Pipeline reached visible output.

## Unsupported By Design

- 36 rows are excluded from the achievable denominator, primarily third-party TradingView imports or host/provider surfaces that TealScript cannot resolve from TradingView source.
- semantic:unresolved-import: 36

## Invalid Pine Exclusions

- 26 rows are excluded from the achievable denominator as invalid Pine under the runner's current validity classifier.
- semantic:duplicate-symbol: 13
- semantic:type-mismatch: 7
- semantic:duplicate-argument: 4
- semantic:implicit-numeric-bool: 2
