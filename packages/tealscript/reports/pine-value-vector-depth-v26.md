> Superseded by `pine-value-vector-depth-v27.md`. Historical measurement only.

# Pine Value Vector Depth Coverage V1

## Basis

- Source cases: `packages/tealscript/scripts/run-pine-value-vectors.ts` at current HEAD.
- Signature source: `packages/tealscript/src/compat/pineV6BuiltinSignatures.ts`.
- Scope: official members already covered by at least one value-vector case and present in the committed signature table.
- Overload coverage is strict when a call uniquely selects that overload; lenient coverage means at least one call is compatible with it.
- Optional argument coverage is by `member:param` slot, reached by either positional or named use.

## Headline

- Covered callable members measured for depth: 327.
- Parse-skipped vector cases: 1 (`language.switch-arm-arrow-continuation-values`).
- Documented overload rows: 10; lenient covered 10/10 (100.00%); strict covered 10/10 (100.00%).
- Documented optional argument slots: 421/465 covered (90.54%); 44 untouched.

## Untouched Optional Argument Slots By Namespace

| Namespace | Untouched optional slots |
| --- | ---: |
| `color` | 1 |
| `hline` | 1 |
| `input` | 3 |
| `matrix` | 1 |
| `plotarrow` | 7 |
| `plotbar` | 4 |
| `plotcandle` | 4 |
| `plotchar` | 7 |
| `request` | 7 |
| `strategy` | 3 |
| `ta` | 4 |
| `ticker` | 2 |

## Untouched Strict Overload Rows

- none

## Untouched Optional Argument Slots

- `color:transp`
- `hline:display`
- `input.enum:confirm`
- `input.price:display`
- `input.text_area:inline`
- `matrix.sort:sort_field`
- `plotarrow:offset`
- `plotarrow:editable`
- `plotarrow:show_last`
- `plotarrow:display`
- `plotarrow:format`
- `plotarrow:precision`
- `plotarrow:force_overlay`
- `plotbar:editable`
- `plotbar:show_last`
- `plotbar:display`
- `plotbar:force_overlay`
- `plotcandle:editable`
- `plotcandle:show_last`
- `plotcandle:display`
- `plotcandle:force_overlay`
- `plotchar:offset`
- `plotchar:editable`
- `plotchar:show_last`
- `plotchar:display`
- `plotchar:format`
- `plotchar:precision`
- `plotchar:force_overlay`
- `request.dividends:lookahead`
- `request.earnings:lookahead`
- `request.security:currency`
- `request.security:calc_bars_count`
- `request.security_lower_tf:currency`
- `request.security_lower_tf:calc_bars_count`
- `request.splits:lookahead`
- `strategy:risk_free_rate`
- `strategy.risk.max_drawdown:alert_message`
- `strategy.risk.max_intraday_loss:alert_message`
- `ta.max:source2`
- `ta.min:source2`
- `ta.pivot_point_levels:developing`
- `ta.vwap:stdev_mult`
- `ticker.modify:backadjustment`
- `ticker.modify:settlement_as_close`
