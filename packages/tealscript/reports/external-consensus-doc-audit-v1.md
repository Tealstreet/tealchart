# External Consensus Fix Documentation Audit v1

Date: 2026-09-12

Scope: read-only audit of the two TealScript behavior changes made on `tealscript-corpus` from external consensus rows in `packages/tealscript/reports/external-pine-consensus-full-v1.*` at `63e3e1805b`.

Commits audited:

- `ad6eaa95fe` (`Fix external consensus value defects`)
- `f5c5bb8c0a` (`Resolve consensus percentile and extremebars values`)

Consensus rows audited:

- `v6 0445` / `v7 0062`: `array.percentile_*` with `"50"` as the `percentage` argument.
- `v6 0673`: `ta.highestbars(4)` at the first full-window bar.

## Verdicts

| Fix | Verdict | Reason |
|---|---|---|
| `array.percentile_nearest_rank(values, "50")` and `array.percentile_linear_interpolation(values, "50")` return `1` | `documented-WRONG` | The Reference Manual signature for `array.percentile_*` requires a numeric `percentage` (`series int/float`). The Pine type-system documentation only permits automatic `int` to `float` casting for numeric float contexts and shows compile-time rejection when the argument type is not accepted. A string literal in this position should be a type error, not a runtime numeric coercion. |
| `ta.highestbars(4)` returns `0` at the first length-boundary bar | `manual-is-silent` | The Reference Manual documents the one-argument overload `ta.highestbars(length) -> series int`, so the call shape is valid, but the manual entry/snippets inspected do not specify the exact first-full-window boundary value. Given the supplied bar data, `0` is plausible if the default source is `high` and the current bar is the highest in the first four-bar window, but that is an inference from normal rolling-window semantics, not an explicit boundary rule in the manual text available here. |

Important commit-state note: the named commit pair is internally non-monotonic for the `highestbars` case. `ad6eaa95fe` changed constructor sizing for source-omitted `ta.highestbars`/`ta.lowestbars` to use `length + 1`, which targets the consensus boundary row. `f5c5bb8c0a` then changed the omitted-source emitter to pass `Number.NaN`, and its tests expected the source-omitted forms to produce all `na`. The current `tealscript-runtime` branch has since moved back to default `ctx.bar.high`/`ctx.bar.low` for source-omitted `HighestBars`/`LowestBars` and numeric offset expectations. This report audits the two requested corpus-branch commits, not the current runtime branch as if it contained those exact edits.

## Documentation Findings

### `array.percentile_*` Percentage Type

The Pine Reference Manual indexes `array.percentile_linear_interpolation(id, percentage)` and `array.percentile_nearest_rank(id, percentage)` with `percentage` as a numeric `series int/float` parameter.

The Pine type-system documentation says Pine automatically casts `int` values to `float` where a float is required. It also demonstrates that using a `const float` where an `int` parameter is expected causes a compile-time error and must be fixed with an explicit cast.

No TradingView documentation found in this audit permits implicit `string` to `int` or `string` to `float` conversion for numeric function parameters. The script rows are explicit invalid-type probes:

```pine
values = array.new_int(2, 1)
plot(array.percentile_linear_interpolation(values, "50"))
```

and:

```pine
values = array.new_int(2, 1)
plot(array.percentile_nearest_rank(values, "50"))
```

Therefore the consensus-driven runtime change in `ad6eaa95fe`, which coerces `percentage` with `Number(percentage)`, teaches TealScript a JavaScript artifact unless a TradingView trace later proves the compiler accepts this invalid type.

### `ta.highestbars` Source-Omitted Boundary

**Superseded on 2026-09-12 by
`ta-extremebars-default-source-regression-v1.md`.** The live TradingView v6
reference bundle remarks are explicit: the one-argument `ta.highestbars`
algorithm uses `high` as the source series, and the one-argument
`ta.lowestbars` algorithm uses `low`. The `manual-is-silent` conclusion below
was incomplete and must not be used to justify all-`na` source-omitted
extremebars output.

The Reference Manual documents both overloads:

```pine
ta.highestbars(source, length) -> series int
ta.highestbars(length) -> series int
```

The consensus row source is:

```pine
plot(ta.highest(close, 3))
plot(ta.lowest(open, 2))
plot(ta.highestbars(4))
plot(ta.lowestbars(length=5))
```

The reported first difference was `plot[2][3] null != 0`, i.e. `ta.highestbars(4)` on bar index 3. The manual establishes the overload is valid, but the available manual text does not explicitly state whether the first bar with exactly `length` bars available returns `na` or an offset.

The stronger statement available from docs is: if the overload is evaluated over the default high series and the current bar is the highest in the four-bar window, offset `0` follows from the function's documented purpose. The exact first-full-window boundary remains manual-silent without a trace or a more explicit TradingView entry.

## External Engine Source Findings

### PineTS

Audited repo/commit: LuxAlgo/PineTS `1fdcf4ab5f8994046f1a95eb741d0fec00e34328`.

`array.percentile_nearest_rank` accepts `percentage: number` at the TypeScript surface, but runtime code compares `percentage` to numeric bounds and divides it by `100` directly. A JavaScript string such as `"50"` therefore becomes numeric by JavaScript coercion.

`array.percentile_linear_interpolation` has the same shape: no runtime Pine type check, then `percentage / 100`.

`ta.highestbars` is implemented as `(source, _length, _callId?)`. It reads `length = Series.from(_length).get(0)` and `series = Series.from(source)`, then returns the max offset after `context.idx >= length - 1`. I did not find a deliberate one-argument Pine overload path in this primitive; the source-omitted case is not explicitly mapped to `high` here.

### Pine-A-Script

Audited repo/commit: MeridianAlgo/Pine-A-Script `6f9e99cd0a0bc895ac661cbfbe2c9ae1fa0df2c9`.

`arrayPercentile` and `arrayPercentileNearestRank` both divide `percentile` by `100` with no Pine type check. `"50" / 100` is a JavaScript coercion path, not deliberate Pine type-system handling.

`highestbars` is implemented as `(series, length)`: it slices the last `length` elements, computes `Math.max`, and returns the offset. The generator marks argument position `0` as a series argument for `pinescript.highestbars`. I did not find explicit one-argument overload lowering from `ta.highestbars(length)` to `high,length`; the primitive itself requires both `series` and `length`.

## Value-Vector Cross-Check

No hand-derived value-vector case in the current `tealscript-runtime` tree covers `array.percentile_*` with a string `percentage`. Existing array percentile vectors use numeric `50`/`75` percentages and distribution-stat expected values.

No hand-derived value-vector case in `run-pine-value-vectors.ts` covers source-omitted `ta.highestbars(length)` at the boundary. Existing value vectors cover explicit-source `ta.highestbars(close, 3)` and hostile explicit-source variants.

Current local compat tests do cover source-omitted `ta.highestbars(length=3)` and expect numeric offsets, but those are local runtime tests, not independent value-vector oracles. They do not resolve the manual-silent boundary question by themselves.

## Routing Recommendation

1. Treat the `array.percentile_*` string-percentage consensus fix as a correlated external-engine error. It should be routed for revert or for a semantic diagnostic that rejects a string where the manual requires numeric `series int/float`.
2. Do not route `ta.highestbars(4)` boundary as documented-wrong. The manual confirms the overload but is silent on the exact first-full-window boundary value in the inspected text. A TradingView trace or a more explicit official entry is needed to upgrade this from `manual-is-silent` to `documented-correct`.
3. Treat JS/TS engine agreement on invalid argument types as suspicious by default. Both external engines produced the percentile result through ordinary JavaScript arithmetic coercion, not through Pine type-system logic.

## Sources

- TradingView Pine Script v6 Reference Manual: https://www.tradingview.com/pine-script-reference/v6/
- TradingView Pine Script type system, especially automatic casting rules: https://www.tradingview.com/pine-script-docs/language/type-system/
- PineTS source at `1fdcf4ab5f8994046f1a95eb741d0fec00e34328`:
  - `src/namespaces/array/methods/percentile_nearest_rank.ts`
  - `src/namespaces/array/methods/percentile_linear_interpolation.ts`
  - `src/namespaces/ta/methods/highestbars.ts`
- Pine-A-Script source at `6f9e99cd0a0bc895ac661cbfbe2c9ae1fa0df2c9`:
  - `src/builtins.js`
  - `src/generator.js`
