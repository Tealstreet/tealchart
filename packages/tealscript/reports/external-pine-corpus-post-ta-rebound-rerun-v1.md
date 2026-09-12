# External Pine Corpus Post-TA-Rebound Rerun v1

Date: 2026-09-12

Previous measurement commit: `7ee7a2c98b`.
Current measurement commit: `37ca779926`.

Machine-readable companion:
`reports/external-pine-corpus-post-ta-rebound-rerun-v1.json`.

## Headline

Against the post-TA-length-rebound baseline, current HEAD moves the three
corpora from `1965/2260` achievable output to `1958/2260`: net `-7`.

The movement is not an `iff()` drop. After stripping `//` comments and
double-quoted strings, v5 + v6 + v7 contain `0` active `iff(...)` calls, and
`e7136357a8` moves `0` output rows. The raw textual `iff` hits are comments or
otherwise non-active source.

Repairs and refusals are separated:

- `+2` rows are repairs from nested switch-arm value fixes
  (`99fb4693b2` / `9458ae288e`).
- `-2` rows are correct request-expression runtime refusals from
  `288f674f3e`; both already had non-fatal swallowed request-expression
  TA-length diagnostics at `7ee7a2c98b`.
- `-1` row is a semantic/drawing type refusal from the widened semantic
  invariant work at `a21d9ffe53`.
- `-5` rows are correct `max_bars_back` refusals from generated history
  reference semantics at `bf94362cd4`.
- `-1` row is a new TealScript regression from shadowed runtime state
  resolution at `b702388213`: declared-v4 legacy bare `pvt` now emits an
  unresolved JavaScript `pvt` binding.
- `0` rows move from the `array.new*()` omitted-`initial_value` Pine-`na` fix
  at `e0714c404b`.
- `0` rows move from the `array.sort` / `array.sort_indices` / `matrix.sort`
  Pine `order.*` enum fix at `07e89eac16`.
- `0` rows move from the runtime color-transparency precision fix
  (`f1a1c6d5d3`) or historical-tick visual output replacement fix
  (`c75fe419ec`); row-level diffs across the late syncs found zero outcome,
  stage, validity, output-produced, or diagnostic differences.
- `0` rows move from manual grammar snippet coverage (`3e0f1e15d9`) or
  compiled enum-lowering guards (`6746da7fb2`); those commits expand tests, not
  corpus acceptance.
- `0` rows move from the declared-v6 `matrix.sort(sort_field=...)` refusal
  (`ba9d31550a`) or grammar-production coverage measurement (`c406ca3593`).
- `0` acceptance rows move from sparse UDF call-site history (`54107d9f61`),
  live-reference matrix `sort_field` restoration (`a170097ed1`), or dynamic
  request loop scoping (`da1e319300`). The request-loop change adds one
  profile-only swallowed request-expression diagnostic with no acceptance
  movement.

## Corpus Movement

| Corpus | Previous | Current | Achievable output |
| --- | --- | --- | ---: |
| v5 | `reports/external-pine-corpus-v5.daily-rerun-7ee7a2c98b.json` | `reports/external-pine-corpus-v5.daily-rerun-37ca779926.json` | `869/925 -> 866/925` (`-3`) |
| v6 | `reports/external-pine-corpus-v6.daily-rerun-7ee7a2c98b.json` | `reports/external-pine-corpus-v6.daily-rerun-37ca779926.json` | `789/935 -> 787/935` (`-2`) |
| v7 | `reports/external-pine-corpus-v7.daily-rerun-7ee7a2c98b.json` | `reports/external-pine-corpus-v7.daily-rerun-37ca779926.json` | `307/400 -> 305/400` (`-2`) |
| Total |  |  | `1965/2260 -> 1958/2260` (`-7`) |

## Repairs

| Corpus | Row | Previous | Current | Attribution |
| --- | --- | --- | --- | --- |
| v6 | `sources/0577__deepentropy-lightweight-charts-indicators__Breakouts-with-Tests-Retests-LuxAlgo-.pine` | `no-output-compiled`, output-silence `conditional-or-data-gated-output-not-triggered` | produced output: `0` plots, `67` drawings | Nested switch-arm statement blocks in the drawing helper now return selected tail values (`99fb4693b2` / `9458ae288e`). |
| v6 | `sources/0578__deepentropy-oakscriptJS__Breakouts-with-Tests-Retests-LuxAlgo-.pine` | `no-output-compiled`, output-silence `conditional-or-data-gated-output-not-triggered` | produced output: `0` plots, `67` drawings | Same duplicated source and same switch/drawing shape as `0577`. |

The recovered sources contain nested `switch` blocks inside local drawing
methods and state machines. They do use `array.new<label>()`, but only as
zero-size collection constructors, so the `array.new*()` omitted-value fill
change is not the acceptance cause.

## Correct Refusals

| Corpus | Row | Previous | Current | Attribution |
| --- | --- | --- | --- | --- |
| v5 | `sources/0865__hasnocool-tradingview-pine-scripts__John-F.-Ehlers-Center-Of-Gravity-Balanced-by-DM-.pine` | produced output with swallowed `compiled-request-expression:request.security:0` TA-length diagnostics | execute failure: `TA length must be a positive integer; got na` | `288f674f3e` propagates known Pine runtime errors out of request-expression replay instead of treating them as non-fatal swallowed diagnostics. |
| v7 | `sources/0359__regalouisei-collect-tradingview__eduvest-qqe-signal-v30-multi-timeframe-scoring-system.pine` | produced output with swallowed `compiled-request-expression:request.security:5` TA-length diagnostics | execute failure: `TA length must be a positive integer; got 4.5` | Same request-expression propagation class as `0865`. |
| v5 | `sources/0952__chauhanvishaal-tv-indicators__Zone_Identifier.pine` | produced output | semantic failure: `box.new top must be a number, got bool` | Semantic type-invariant widening at `a21d9ffe53` exposes `dispEnd` from tuple-returned detection logic flowing into `box.new(top=...)`. |
| v6 | `sources/0489__turnupdigital-riskmanager__SimpleMarketMetrics.pine` | produced output | execute failure: `Historical offset 501 exceeds max_bars_back 500` | Generated history references now honor declared or inferred `max_bars_back` capacity (`bf94362cd4`). |
| v6 | `sources/0521__helenananaa-pine-compat-runtime__supported_max_bars_back_if_expression_block_call.pine` | produced output | execute failure: `Historical offset 501 exceeds max_bars_back 500` | Same `max_bars_back` history-reference refusal. |
| v6 | `sources/0598__wanjo-tech-kk__mVoltThermo.pine` | produced output | execute failure: `Historical offset 501 exceeds max_bars_back 500` | Same `max_bars_back` history-reference refusal. |
| v6 | `sources/0635__LongVu5228-Swing-Long-System__pinescript-indicators.pine` | produced output | execute failure: `Historical offset 501 exceeds max_bars_back 500` | Same `max_bars_back` history-reference refusal. |
| v7 | `sources/0330__hasnocool-tradingview-pine-scripts__Strategy-LinReg-ST-RL.pine` | produced output | execute failure: `Historical offset 1 exceeds max_bars_back 0` | Same `max_bars_back` history-reference refusal. |

These are refusals, not repairs, and should not be netted against the two v6
recoveries.

## Regression

| Corpus | Row | Previous | Current | Attribution |
| --- | --- | --- | --- | --- |
| v5 | `sources/0478__everget-tradingview-pinescript-indicators__price_volume_trend.pine` | produced output | `no-output-compiled`, swallowed compiled-bar `pvt is not defined` on `1600` bars | Shadowed runtime state resolution at `b702388213` changed root/global series resolution. The declared-v4 source uses legacy bare `pvt` as a TA series variable in `ema(pvt, ...)`, `plot(pvt, ...)`, and crossover calls; generated code now reads an unresolved JavaScript `pvt` binding. |

This is a real TealScript regression, not a correct Pine refusal. It should be
routed to the runtime/codegen lane as legacy bare TA variable lookup under
declared v4.

## Profile-Only Movement

| Corpus | Row | Previous | Current | Attribution |
| --- | --- | --- | --- | --- |
| v6 | `sources/0098__llipe-tradingview-scripts__indicator-scalping-1m-5m-EMA-ADX.pine` | execute failure: request context limit, no swallowed request-expression diagnostic | same execute failure and same validity/outcome, plus swallowed `compiled-request-expression:request.security:1` diagnostic `Cannot read properties of undefined (reading '1')` | Dynamic request loop scoping at `da1e319300` changes request-expression profile diagnostics but not acceptance. |

The v6 profile-only row is not counted in the headline because outcome, failed
stage, validity bucket, output-produced flag, and first diagnostic are
unchanged.

## `iff()` Check

Commit `e7136357a8` now refuses legacy global `iff()` under declared Pine v5 and
v6. The current corpus rerun found no acceptance movement from that refusal:

- Active `iff(...)` calls after stripping `//` comments and double-quoted
  strings: `0`.
- Rows dropping from output because of the new `iff()` diagnostic: `0`.
- Rows changing diagnostic because of `iff()`: `0`.

The raw text scan finds comment-only `iff(...)` examples in v6/v7 and one v5
row whose JSON text contains `iff`, but no active modern-Pine call is exercised.

## Method

- Rebuilt missing v5 and v6 source caches from pinned daily reports before the
  run. v5 refetch matched `1000/1000` byte sizes and `1000/1000` hashes; v6 did
  the same.
- Ran the daily profile with `1600` synthetic bars at commit `37ca779926`.
- Compared current rows against the post-TA-rebound baseline reports at
  `7ee7a2c98b` by `localPath`.
- Classified rows whose `outcome`, first failed stage, diagnostic, validity
  bucket, or output-produced flag changed; exactly eleven rows changed output
  status against `7ee7a2c98b`.
- An earlier clean checkpoint at `8b82a5eca0` measured `1964/2260`, but the
  required parity sync added `bf94362cd4`; the later `5bfb14ac9b` rerun
  accounted for the additional five `max_bars_back` refusals.
- A final sync to `53253d92d7` brought the runtime color-transparency precision
  fix (`f1a1c6d5d3`) and value-vector report churn. Rerunning all three corpora
  at `53253d92d7` matched `5bfb14ac9b` at row level: zero outcome, stage,
  validity, output-produced, or diagnostic differences.
- A later sync to `f1813ae422` brought the historical-tick visual output
  replacement fix (`c75fe419ec`). Rerunning all three corpora again matched
  `53253d92d7` at row level with the same zero-difference criteria.
- A final sync to `a898be4847` brought the declared-v6
  `matrix.sort(sort_field=...)` refusal (`ba9d31550a`) and grammar-production
  coverage measurement (`c406ca3593`). Rerunning all three corpora again
  matched `f1813ae422` at row level with the same zero-difference criteria.
- A later sync to `37ca779926` brought runtime/codegen fixes for dynamic
  request loop scoping (`da1e319300`), sparse UDF call-site history
  (`54107d9f61`), live-reference matrix `sort_field` restoration
  (`a170097ed1`), and shadowed runtime state resolution (`b702388213`). The
  row-level diff from `a898be4847` to `37ca779926` found one acceptance change:
  the v5 `pvt` regression above. It also found one v6 profile-only swallowed
  request-expression diagnostic and no v6/v7 acceptance movement.
- Manual grammar snippet coverage (`3e0f1e15d9`) and compiled enum-lowering
  guards (`6746da7fb2`) are included in the measured tree, but they are
  coverage-only changes for this acceptance rerun and moved `0` corpus output
  rows.
