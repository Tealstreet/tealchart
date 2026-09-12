> Superseded by `pine-value-vector-depth-v34.md`. Historical measurement only.

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
- Documented optional argument slots: 456/465 covered (98.06%); 9 untouched.

## Untouched Optional Argument Slots By Namespace

| Namespace | Untouched optional slots |
| --- | ---: |
| `color` | 1 |
| `matrix` | 1 |
| `request` | 7 |

## Untouched Strict Overload Rows

- none

## Untouched Optional Argument Slots

- `color:transp`
- `matrix.sort:sort_field`
- `request.dividends:lookahead`
- `request.earnings:lookahead`
- `request.security:currency`
- `request.security:calc_bars_count`
- `request.security_lower_tf:currency`
- `request.security_lower_tf:calc_bars_count`
- `request.splits:lookahead`
