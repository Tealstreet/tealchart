# Pine Built-In Coverage

This file is the Epic 5 phase-1 inventory for Pine Script v6 built-in parity.
It is not a claim of full parity. It records local TealScript runtime
registrations, the official source links used for audit work, and the owner
epic for each namespace so built-in gaps are tracked instead of discovered
ad hoc.

## Sources

- [TradingView Pine Script v6 Reference Manual](https://www.tradingview.com/pine-script-reference/v6/)
- [Built-ins](https://www.tradingview.com/pine-script-docs/language/built-ins/)
- [Type system](https://www.tradingview.com/pine-script-docs/language/type-system/)
- [Time series](https://www.tradingview.com/pine-script-docs/language/time-series/)
- [Execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

## Local Inventory Method

The local count is generated from runtime registrations in:

- `src/runtime/engine.ts`
- `src/runtime/builtins/drawings.ts`

Extraction pattern:

```text
builtins.set("...")
this.builtins.set("...")
```

Last audited: 2026-06-01

Local runtime registrations: 429

## Namespace Coverage

| Namespace | Local registrations | Status | Follow-up |
| --- | ---: | --- | --- |
| `(global)` | 23 | Partial | Epic 5 global helpers, Epic 10 visuals, Epic 13 alerts |
| `adjustment` | 3 | Partial | Epic 9 ticker and request data |
| `alert` | 3 | Partial | Epic 13 alerts |
| `array` | 56 | Partial | Epic 12 collections |
| `backadjustment` | 3 | Partial | Epic 9 ticker and request data |
| `barmerge` | 4 | Partial | Epic 8 request data |
| `box` | 31 | Partial | Epic 11 drawing objects |
| `chart` | 5 | Partial | Epic 11 drawing objects |
| `color` | 7 | Partial | Epic 5 `color.*` pass |
| `dayofweek` | 7 | Partial | Epic 7 time and sessions |
| `hline` | 3 | Partial | Epic 10 visuals |
| `input` | 12 | Partial | Epic 6 inputs |
| `label` | 25 | Partial | Epic 11 drawing objects |
| `line` | 20 | Partial | Epic 11 drawing objects |
| `linefill` | 6 | Partial | Epic 11 drawing objects |
| `log` | 3 | Partial | Epic 13 alerts and logs |
| `map` | 11 | Partial | Epic 12 collections |
| `math` | 28 | Partial | Epic 5 `math.*` pass |
| `matrix` | 34 | Partial | Epic 12 collections |
| `plot` | 10 | Partial | Epic 10 visuals |
| `polyline` | 4 | Partial | Epic 11 drawing objects |
| `runtime` | 1 | Partial | Epic 2 and Epic 13 runtime errors/logs |
| `session` | 2 | Partial | Epic 7 time and sessions |
| `settlement_as_close` | 3 | Partial | Epic 9 ticker and request data |
| `str` | 18 | Partial | Epic 5 `str.*` pass |
| `strategy` | 31 | Partial | Epic 14 strategy broker emulator |
| `ta` | 56 | Partial | Epic 5 `ta.*` pass |
| `table` | 8 | Partial | Epic 11 drawing objects |
| `ticker` | 9 | Partial | Epic 9 ticker and request data |
| `timeframe` | 3 | Partial | Epic 7 time and sessions |

## Epic 5 Audit Targets

Epic 5 is limited to the common standard-library namespaces that unblock a
large share of public indicators. Namespaces listed below should move from
approximate coverage to tested Pine-compatible behavior.

| Namespace | Current local surface | Main gaps to audit |
| --- | --- | --- |
| `ta.*` | 56 registrations covering moving averages, oscillators, pivots, ranges, tuples, and volume helpers | Exact `na` handling, warmup lengths, tuple return shapes, source defaults, oscillator variants, smoothing variants, edge-case parity |
| `math.*` | 28 registrations covering constants, numeric operators, rounding, trig, logs, random, and mintick rounding | Overloads, integer vs float return behavior, deterministic random semantics, `na` propagation, mintick rounding exactness |
| `str.*` | 18 registrations covering search, replace, split, case, formatting, conversion, and trimming | `str.tonumber`, `str.format_time`, placeholder compatibility, Unicode and escape handling, exact `na` conversion behavior |
| `color.*` | 7 registrations covering RGB construction, channel extraction, transparency, and gradients | Named constants, transparency range behavior, channel precision, theme-sensitive behavior where possible |
| Global helpers | 23 mixed global registrations including casts, `na`, `nz`, `fixnan`, time helpers, and visual functions | Typed casts, `na`/`nz`/`fixnan` parity across types, and separation of visual/data helpers into later epics |

Current `math.*` progress:

- Common scalar helpers support Pine-style named arguments, including
  `number=`, `base=`, `exponent=`, and `precision=`.
- Variadic `math.max()`, `math.min()`, and `math.avg()` support Pine-style
  `number0=`, `number1=`, and later `numberN=` arguments.
- `math.round_to_mintick()` normalizes floating-point residue to the symbol
  tick precision and supports Pine-style `number=` named arguments.
- `math.sum()` supports `source=` and `length=` named arguments while preserving
  the existing latest non-`na` window behavior.
- `math.random()` already supports named `min=`, `max=`, and `seed=`.

Current `ta.*` progress:

- Common `ta.*` helpers accept Pine-style named arguments for covered
  parameters.
- Event and cross helpers accept Pine-style named arguments for covered
  `condition`/`source` parameters and cross helper `source1`/`source2`
  parameters.
- `ta.highest`, `ta.lowest`, `ta.highestbars`, and `ta.lowestbars` support the
  one-argument default-source forms.
- Common windowed helpers now track derived source expressions such as
  `ta.sma(close - open, length)` using call-local history instead of falling
  back to chart `close`.
- `ta.stdev` and `ta.variance` support the `biased` parameter.
- `ta.ema` and `ta.rma` use stable call-site state for recursive smoothing.
- `ta.dmi`, `ta.sar`, `ta.pivothigh`, `ta.pivotlow`, and `ta.linreg`
  accept Pine-style named arguments; pivot helpers also support default-source
  two-argument forms.

Current `str.*` progress:

- `str.tonumber()` uses strict decimal/scientific parsing so JavaScript-only
  forms such as hexadecimal and infinity return `na`.
- Formatting helpers accept Pine-style named arguments for covered conversion
  and time-formatting parameters. `str.format()` supports Pine-style numeric
  placeholder modifiers for decimal masks, integer, currency, and percent
  output.
- Covered string search, substring, split, case, trim, replacement, and repeat
  helpers accept Pine-style named arguments while preserving positional calls.
- `str.format_time()` uses the Pine v6 ISO-style default format and supports
  quoted literals, single date/time tokens, 12-hour `h`/`hh` and AM/PM `a`
  tokens, and numeric timezone offsets.

Current `color.*` progress:

- Covered color constructors and channel helpers accept Pine-style named
  arguments.
- `color.none` maps to the runtime's existing invisible/`na` plot color
  representation.
- Gradient helpers support named value, bound, and color parameters for common
  public-script idioms.

Current global-helper progress:

- `nz`, `fixnan`, `na`, and primitive casts accept Pine-style named arguments
  for covered parameters.
- v6 bool rejection for `nz` and `fixnan` now applies to named arguments as
  well as positional arguments.

Current `input.*` progress:

- Generic and typed input helpers accept Pine-style `defval=` and `title=`
  named arguments while preserving existing input IDs and metadata.
- Typed input helpers preserve common positional and named metadata, including
  range bounds, steps, options, confirm, display, active, group, inline, and
  tooltip. Invalid typed defaults now fail early.
- `input.source()` registers source metadata and returns host-provided overrides
  when present.
- `indicator(..., shorttitle=...)` is exposed on execution results as
  `indicatorShortTitle` for chart/settings consumers.
- `indicator(..., overlay=..., precision=...)` is exposed on execution results
  as `indicatorOverlay` and `indicatorPrecision`.
- `indicator(..., format=..., scale=...)` is exposed on execution results as
  `indicatorFormat` and `indicatorScale`.
- Advanced `indicator()` declaration settings for timeframe, gap handling,
  object limits, explicit plot z-order, behind-chart mode, calc bars count, and
  dynamic request mode are exposed on execution results.

## Out-Of-Scope Namespaces For Epic 5

These namespaces are tracked here because they are built-ins, but their parity
work belongs to later epics:

- Epic 6: `input.*`
- Epic 7: `dayofweek.*`, `session.*`, `timeframe.*`, time globals
- Epic 8: `barmerge.*`, request-related behavior
- Epic 9: `ticker.*`, adjustment constants, non-standard chart data
- Epic 10: plot and visual output functions/constants
- Epic 11: `label.*`, `line.*`, `box.*`, `linefill.*`, `polyline.*`,
  `table.*`, `chart.point.*`
- Epic 12: `array.*`, `map.*`, `matrix.*`
- Epic 13: `alert.*`, `log.*`, runtime/logging integration
- Epic 14: `strategy.*`

## Maintenance Rules

- Update this file when a built-in namespace changes status or ownership.
- Use deterministic local bars for behavior tests.
- Reduce official-doc or public Pine idioms into small fixtures instead of
  depending on TradingView or live scripts at test time.
- Do not treat the local registration count as the official Pine count. It is
  only a TealScript implementation inventory.
