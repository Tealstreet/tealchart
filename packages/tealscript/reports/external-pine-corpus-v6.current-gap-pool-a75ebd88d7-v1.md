> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v6 Current Gap Pool Audit v1

Date: 2026-09-11
Measurement commit: `a75ebd88d7e060fbdb5ad8d773f4eef15778cf92`
Report branch commit before this report: `b8fa53d95fcba3e14df1c9e5c69a55e9226383a3`
Input rerun: `reports/external-pine-corpus-v6.daily-rerun-a75ebd88d7.json`
Pinned source tree: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911`

This replaces the stale v6 top-cause, remaining-cause, tail-cause, and artifact-bucket classifications with one classification of the current 121-row `tealscript-gap` pool measured at `a75ebd88d7`.

## Summary

| Bucket | Rows |
| --- | --- |
| invalid-pine | 54 |
| artifact | 48 |
| trace-required | 18 |
| real-gap | 1 |

Stage split by first failed stage and audited bucket:

| Stage | Bucket | Rows |
| --- | --- | --- |
| execute | artifact | 3 |
| execute | invalid-pine | 6 |
| execute | real-gap | 1 |
| execute | trace-required | 3 |
| output | artifact | 41 |
| parse | artifact | 4 |
| parse | invalid-pine | 8 |
| semantic | invalid-pine | 40 |
| semantic | trace-required | 15 |

Headline: only `0129` remains a defensible implementation handoff in the current 121-row pool. The rest are invalid Pine by declared version, corpus/chart/output artifacts, or trace/host-required surfaces.

## The +15 Question

The later daily baseline moved from 781 to 796 output rows at `a75ebd88d7`, so the net headline gain is +15. The original top-cause audit's 24 real parser handoff rows all now parse, but they do not map one-for-one to that later baseline: at current HEAD, 16 of those 24 produce output and 8 do not.

For cross-checking the later baseline artifact directly: 27 rows were still daily parse-stage TealScript gaps there; 17 now parse, and 12 of those now produce output. That accounts for the observed +15 without inventing a ninth current second-wall row.

| Row | Current stage | Current bucket | Second wall |
| --- | --- | --- | --- |
| 0335 | semantic | unsupported-by-design | host library source/registry entry is required before engine parity can be judged; 9:1: unresolved-import: Import 'boitoki/AwesomeColor/4' as alias 'ac' was not supplied by the host library registry; ... |
| 0485 | semantic | unsupported-by-design | host library source/registry entry is required before engine parity can be judged; 9:1: unresolved-import: Import 'boitoki/TableColorTheme/1' as alias 'mycolor' was not supplied by the host library re... |
| 0486 | semantic | invalid-pine | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 643:5: unknown-identifier: Unknown identifier: swept |
| 0491 | output | artifact | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0642 | semantic | unsupported-by-design | host library source/registry entry is required before engine parity can be judged; 10:1: unresolved-import: Import 'boitoki/AwesomeColor/3' as alias 'ac' was not supplied by the host library registry;... |
| 0357 | semantic | unsupported-by-design | host library source/registry entry is required before engine parity can be judged; 8:1: unresolved-import: Import 'algotraderdev/contrast/1' as alias 'contrast' was not supplied by the host library re... |
| 0551 | semantic | unsupported-by-design | host library source/registry entry is required before engine parity can be judged; 6:1: unresolved-import: Import 'Electrified/Momentum/5' as alias 'Momentum' was not supplied by the host library regi... |
| 0410 | semantic | unsupported-by-design | host library source/registry entry is required before engine parity can be judged; 8:1: unresolved-import: Import 'kaigouthro/hsvColor/15' as alias 'kai' was not supplied by the host library registry;... |

## Real Gap Handoff

| Row | Stage | Owner | Why | Minimal repro |
| --- | --- | --- | --- | --- |
| 0129 | execute | semantic/runtime binding | receiver method table.cell rejects named style arguments that valid namespace table.cell accepts | `//@version=6\nindicator("table method text_color repro")\nvar table t = table.new(position.top_right, 1, 1)\nif barstate.islast\n    t.cell(0, 0, "x", text_color=color.white)` |

## Trace/Register Rows

The 18 current `tealscript-gap` trace-required rows are covered by `packages/tealscript/PINE_TRACE_REQUIRED_v2.md`. The third-party host-library imports in the parser second-wall table are outside the current 121-row `tealscript-gap` pool as `unsupported-by-design`; they are host-source requirements, not implementation handoffs.

| Surface | Rows | Evidence |
| --- | --- | --- |
| `strategy(calc_on_order_fills=true)` | 0712, 0718, 0746, 0783, 0894, 0897, 0966 | Requires TradingView fill-triggered re-entry trace parity. |
| `strategy(fill_orders_on_standard_ohlc=true)` | 0706, 0710, 0745, 0772, 0773, 0821 | Requires host-supplied standard OHLC bars for non-standard charts. |
| `strategy(risk_free_rate=...)` | 0758, 0901 | Requires Strategy Tester report metric trace parity. |
| `request.security_lower_tf()` chart context | 0266, 0615, 0849 | Measured daily chart context is not lower than the requested timeframe. |

## Row Classification

| Row | Version | Kind | Stage | Bucket | Owner | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 0085 | v6 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 68:33: argument-count: ta.vwma() expects at most 2 arguments |
| 0086 | v6 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 11:23: type-mismatch: ta.highest length must be a number, got string |
| 0087 | v6 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 13:38: type-mismatch: na x cannot be a boolean because Pine v6 does not allow boolean na values. This was valid in Pi... |
| 0117 | v6 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 66:78: unknown-argument: Unknown argument 'alpha' for hline() |
| 0129 | v6 | indicator | execute | real-gap | semantic/runtime binding | receiver method table.cell rejects named style arguments that valid namespace table.cell accepts; runtime.error: Unknown argument 'text_color' for method cell |
| 0163 | v6 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 25:17: type-mismatch: str.length source must be a string, got float |
| 0168 | v6 | indicator | execute | invalid-pine | none | script reaches a Pine runtime constraint or impossible state; TradingView would stop execution too; Matrix power must be a non-negative integer |
| 0181 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 14:13: unknown-identifier: Unknown identifier: src |
| 0185 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 26:9: unknown-assignment-target: Cannot assign to undeclared identifier: gapRed |
| 0188 | v5 | strategy | parse | artifact | corpus | prompt/prose harvested as Pine source; 1:55: Expected "/*", [ \t], or [0-9] but "\n" found. |
| 0189 | v5 | strategy | parse | artifact | corpus | prompt/prose harvested as Pine source; 1:55: Expected "/*", [ \t], or [0-9] but "\n" found. |
| 0193 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 20:19: unknown-identifier: Unknown identifier: pi |
| 0194 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 34:22: qualifier-mismatch: Cannot pass series value to simple parameter 'len' for function qsfd; use an input/simple ... |
| 0202 | v5 | indicator | execute | invalid-pine | none | script reaches a Pine runtime constraint or impossible state; TradingView would stop execution too; Cannot create an array with a negative size |
| 0208 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 14:27: argument-count: ta.ao() expects at most 0 arguments |
| 0219 | v5 | indicator | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0223 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 33:15: type-mismatch: Cannot use float value as int array element |
| 0231 | v5 | indicator | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0251 | v5 | indicator | output | artifact | corpus | global-output classifier artifact: audited source uses hidden plots or invalid indicator/strategy shape; output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither... |
| 0266 | v5 | indicator | execute | trace-required | trace/host | request.security_lower_tf needs lower-timeframe chart/request context; already trace/register surface; runtime.error: request.security_lower_tf requires a lower timeframe than the chart timeframe: 60 |
| 0276 | v5 | indicator | output | artifact | corpus | global-output classifier artifact: audited source uses hidden plots or invalid indicator/strategy shape; output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither... |
| 0281 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 2:80: unknown-argument: Unknown argument 'margin_top' for indicator() |
| 0284 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 62:35: type-mismatch: Invalid table.new position: position.middle. Use one of the position.* constants such as positi... |
| 0329 | v5 | indicator | output | artifact | corpus | global-output classifier artifact: audited source uses hidden plots or invalid indicator/strategy shape; output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither... |
| 0331 | v5 | indicator | output | artifact | corpus | global-output classifier artifact: audited source uses hidden plots or invalid indicator/strategy shape; output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither... |
| 0332 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 23:25: unknown-identifier: Unknown identifier: emaFast |
| 0336 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 22:22: unknown-identifier: Unknown identifier: _co_gbl_up |
| 0339 | v5 | indicator | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0343 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 337:8: unknown-identifier: Unknown identifier: error_log_level |
| 0358 | v5 | indicator | execute | invalid-pine | none | script reaches a Pine runtime constraint or impossible state; TradingView would stop execution too; Array index 2 is out of bounds. Array size is 2 |
| 0367 | v5 | indicator | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0376 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 10:22: type-mismatch: Cannot use udt value as udt array element |
| 0394 | v5 | indicator | output | artifact | corpus | global-output classifier artifact: audited source uses hidden plots or invalid indicator/strategy shape; output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither... |
| 0397 | v5 | indicator | parse | invalid-pine | none | syntax rejected under the row declared Pine version; 282:9: Expected "(", ")", ".", "/*", "//", "[", [ \t], or [\n\r] but "o" found. |
| 0408 | v5 | indicator | execute | artifact | corpus/fixture | script-authored runtime.error under the measured chart/timeframe/data profile; 30:1: runtime.error: The max timeframe allowed is 15 minutes. |
| 0415 | v5 | indicator | execute | invalid-pine | none | script reaches a Pine runtime constraint or impossible state; TradingView would stop execution too; Array index 2 is out of bounds. Array size is 2 |
| 0422 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 14:26: unknown-identifier: Unknown identifier: cleanTicker |
| 0434 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 6:11: unknown-function: Unknown function: polyline |
| 0436 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 3:8: invalid-type-template: Invalid array element type 'map'; collection template types must include their element te... |
| 0440 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 9:16: type-mismatch: Cannot use udt value as udt array element |
| 0461 | v5 | indicator | parse | artifact | corpus | copy/byte artifact: U+3000 full-width layout whitespace; 241:5: Unexpected full-width space (U+3000 IDEOGRAPHIC SPACE). Non-breaking spaces (U+00A0) are tolerated as layout w... |
| 0473 | v5 | indicator | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0486 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 643:5: unknown-identifier: Unknown identifier: swept |
| 0491 | v5 | indicator | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0496 | v5 | indicator | parse | invalid-pine | none | syntax rejected under the row declared Pine version; 409:42: Pine Script does not support JavaScript-style inline callback functions. Declare a named Pine function with =... |
| 0512 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 3:8: invalid-type-template: Invalid array element type 'matrix'; collection template types must include their element... |
| 0547 | v5 | indicator | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0560 | v5 | indicator | parse | invalid-pine | none | syntax rejected under the row declared Pine version; 237:25: Pine Script `if` statements do not use `then`; put the block on the following indented line. |
| 0562 | v5 | indicator | parse | artifact | corpus | copy/byte artifact: U+3000 full-width layout whitespace; 241:5: Unexpected full-width space (U+3000 IDEOGRAPHIC SPACE). Non-breaking spaces (U+00A0) are tolerated as layout w... |
| 0568 | v5 | indicator | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0577 | v5 | indicator | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0578 | v5 | indicator | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0585 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 3:10: invalid-type-template: Invalid array element type 'matrix'; collection template types must include their elemen... |
| 0596 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 83:5: scope-mismatch: alertcondition() must be called from the global scope; move the call out of the local block |
| 0609 | v5 | indicator | output | artifact | corpus | global-output classifier artifact: audited source uses hidden plots or invalid indicator/strategy shape; output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither... |
| 0615 | v5 | indicator | execute | trace-required | trace/host | request.security_lower_tf needs lower-timeframe chart/request context; already trace/register surface; runtime.error: request.security_lower_tf requires a lower timeframe than the chart timeframe: 60 |
| 0617 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 62:133: type-mismatch: Invalid plot style: plot.style_dashed |
| 0621 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 21:27: unknown-identifier: Unknown identifier: _co_gbl_up |
| 0623 | v5 | indicator | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0628 | v5 | indicator | parse | invalid-pine | none | syntax rejected under the row declared Pine version; 82:9: Pine Script has no `return` statement; a Pine function returns the value of its last expression. |
| 0631 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 74:191: unknown-argument: Unknown argument 'bgcolor' for label.new() |
| 0636 | v5 | indicator | execute | artifact | corpus/fixture | script-authored runtime.error under the measured chart/timeframe/data profile; 637:1: runtime.error: Not enough data to calculate Pivot Points. Lower the Pivots Timeframe in the indicator settings. |
| 0645 | v5 | indicator | execute | artifact | corpus/fixture | script-authored runtime.error under the measured chart/timeframe/data profile; 637:1: runtime.error: Not enough data to calculate Pivot Points. Lower the Pivots Timeframe in the indicator settings. |
| 0648 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 59:26: argument-count: ta.pivothigh() expects at least 2 arguments |
| 0670 | v5 | indicator | execute | invalid-pine | none | script reaches a Pine runtime constraint or impossible state; TradingView would stop execution too; Array is too large. Maximum size is 100000 |
| 0674 | v5 | indicator | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 9:18: type-mismatch: Cannot use udt value as udt array element |
| 0680 | v5 | indicator | execute | invalid-pine | none | script reaches a Pine runtime constraint or impossible state; TradingView would stop execution too; Array index 0 is out of bounds. Array size is 0 |
| 0699 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0706 | v6 | strategy | semantic | trace-required | trace/host | strategy declaration option requires TradingView host/trace semantics; 4:63: unsupported-feature: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for n... |
| 0710 | v6 | strategy | semantic | trace-required | trace/host | strategy declaration option requires TradingView host/trace semantics; 5:73: unsupported-feature: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for n... |
| 0712 | v6 | strategy | semantic | trace-required | trace/host | strategy declaration option requires TradingView host/trace semantics; 8:26: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parit... |
| 0717 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0718 | v6 | strategy | semantic | trace-required | trace/host | strategy declaration option requires TradingView host/trace semantics; 10:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace pari... |
| 0719 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0728 | v6 | strategy | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 30:1: unknown-identifier: Unknown identifier: macd_line |
| 0731 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0737 | v6 | strategy | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 22:5: type-mismatch: strategy.exit requires a limit, stop, profit, loss, or trailing stop price |
| 0742 | v6 | strategy | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 44:6: unknown-identifier: Unknown identifier: positionValue |
| 0745 | v6 | strategy | semantic | trace-required | trace/host | strategy declaration option requires TradingView host/trace semantics; 7:74: unsupported-feature: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for n... |
| 0746 | v6 | strategy | semantic | trace-required | trace/host | strategy declaration option requires TradingView host/trace semantics; 19:67: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace pari... |
| 0758 | v6 | strategy | semantic | trace-required | trace/host | strategy declaration option requires TradingView host/trace semantics; 6:21: unsupported-feature: strategy risk_free_rate=0 requires TradingView Sharpe/Sortino report trace parity before T... |
| 0767 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0772 | v6 | strategy | semantic | trace-required | trace/host | strategy declaration option requires TradingView host/trace semantics; 2:66: unsupported-feature: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for n... |
| 0773 | v6 | strategy | semantic | trace-required | trace/host | strategy declaration option requires TradingView host/trace semantics; 7:36: unsupported-feature: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for n... |
| 0783 | v6 | strategy | semantic | trace-required | trace/host | strategy declaration option requires TradingView host/trace semantics; 2:97: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parit... |
| 0807 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0809 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0816 | v6 | strategy | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 20:24: unknown-argument: Unknown argument 'contract_size' for strategy() |
| 0819 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0821 | v6 | strategy | semantic | trace-required | trace/host | strategy declaration option requires TradingView host/trace semantics; 9:76: unsupported-feature: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for n... |
| 0845 | v6 | strategy | parse | invalid-pine | none | syntax rejected under the row declared Pine version; 60:13: Pine Script statements are separated by new lines or supported comma chains; semicolons are not valid statemen... |
| 0848 | v6 | strategy | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 162:15: type-mismatch: input.float defval must be greater than or equal to minval |
| 0849 | v6 | strategy | execute | trace-required | trace/host | request.security_lower_tf needs lower-timeframe chart/request context; already trace/register surface; runtime.error: request.security_lower_tf requires a lower timeframe than the chart timeframe: 60 |
| 0855 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0880 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0883 | v6 | strategy | parse | invalid-pine | none | syntax rejected under the row declared Pine version; 67:15: Pine Script statements are separated by new lines or supported comma chains; semicolons are not valid statemen... |
| 0894 | v6 | strategy | semantic | trace-required | trace/host | strategy declaration option requires TradingView host/trace semantics; 21:26: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace pari... |
| 0897 | v6 | strategy | semantic | trace-required | trace/host | strategy declaration option requires TradingView host/trace semantics; 9:31: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parit... |
| 0901 | v6 | strategy | semantic | trace-required | trace/host | strategy declaration option requires TradingView host/trace semantics; 10:25: unsupported-feature: strategy risk_free_rate=0 requires TradingView Sharpe/Sortino report trace parity before ... |
| 0903 | v6 | strategy | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 56:9: unknown-function: Unknown function: runtime.log |
| 0908 | v6 | strategy | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 114:97: unknown-identifier: Unknown identifier: day |
| 0910 | v6 | strategy | parse | invalid-pine | none | syntax rejected under the row declared Pine version; 67:33: Pine Script uses the word operator `or`; JavaScript-style `\|\|` is not valid Pine syntax. |
| 0912 | v6 | strategy | parse | invalid-pine | none | syntax rejected under the row declared Pine version; 60:19: Pine Script statements are separated by new lines or supported comma chains; semicolons are not valid statemen... |
| 0917 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0919 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0922 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0923 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0924 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0926 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0927 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0928 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0931 | v6 | strategy | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 4:47: unknown-argument: Unknown argument 'when' for strategy.entry() |
| 0946 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0951 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0965 | v6 | strategy | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0966 | v6 | strategy | semantic | trace-required | trace/host | strategy declaration option requires TradingView host/trace semantics; 15:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace pari... |
| 0977 | v6 | strategy | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 246:4: unknown-identifier: Unknown identifier: dayofyear |
| 0981 | v6 | library | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0984 | v6 | library | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
| 0988 | v6 | library | semantic | invalid-pine | none | semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 346:9: tuple-shape-mismatch: Tuple declaration expects 2 values but initializer arm returns 3 |
| 0994 | v6 | library | output | artifact | corpus/fixture | conditional/data-gated output did not trigger on either calibrated fixture profile; output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gate... |
