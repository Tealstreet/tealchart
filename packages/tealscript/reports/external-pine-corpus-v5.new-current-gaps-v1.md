> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 New Current Gaps V1

Basis: `external-pine-corpus-v5.remaining-gap-dispatch-v4.md`, measured at `282c41d0a868556588f1e8555c69bf079a527a13` on the pinned v5 corpus with the 1,600-bar realistic fixture.

The 34 rows here are current TealScript gaps that were not present in the old V2 dispatch. They are not all fixture-only discoveries: a same-code legacy-bar spot check shows the 9 `array.sort()` rows also fail on the old 160-bar fixture. The fixture-only signal is narrower: five old gaps recover under realistic bars, and two remaining execute failures are still data/loop-shape sensitive.

## Ranked Causes

- `array.sort()` one-argument form: 9 rows. Tracked separately; zx4rrg is adjudicating whether Pine accepts the missing `order` argument.
- `strategy()` camelCase `initialCapital`: 7 rows. This is a strategy declaration argument spelling surface, concentrated in KnectarDev strategy variants.
- Unresolved identifiers/source-context rows: 7 rows. Mixed causes: self-referential local history (`ji`/`jq`), later declarations used by earlier generated module blocks (`pivotsToKeep`), incomplete standalone snippets (`delta`), and unresolved local signal names (`buy`).
- Series value passed to `simple` UDF parameter: 4 rows. Numeric helper UDFs mark parameters `simple` but call sites pass series values after realistic execution reaches those paths.
- `calc_on_order_fills=true` trace-required strategy refusal: 3 rows. These are deliberate loud refusals pending TradingView fill-triggered re-entry trace parity.
- Execute-stage array/matrix bounds under realistic data: 2 rows. These remain the fixture/loop-bound sensitive tail: `polyfit` matrix pivot loops and S/R zone arrays.
- Local `request.security` without `dynamic_requests=true`: 1 row.
- Invalid table position enum probe still counted as a gap: 1 row.

Top three excluding the separately-owned `array.sort()` class: `strategy(initialCapital)` (7), unresolved identifier/source-context rows (7), and simple-parameter qualifier mismatches (4).

## Cause Details

### `array.sort()` One-Argument Form (9)

Representative row: `sources/0121__mihakralj-pinescript__rmed.pine`, v6, line 45: `array.sort(temp)`.

Minimal repro:

```pine
//@version=6
indicator("array sort default order")
values = array.from(close, open)
array.sort(values)
plot(array.get(values, 0))
```

Pinned rows:

- `sources/0121__mihakralj-pinescript__rmed.pine`
- `sources/0263__mihakralj-pinescript__iqr.pine`
- `sources/0269__mihakralj-pinescript__median.pine`
- `sources/0271__mihakralj-pinescript__percentile.pine`
- `sources/0273__mihakralj-pinescript__quantile.pine`
- `sources/0352__mihakralj-pinescript__yzvama.pine`
- `sources/0566__casoon-pine-scripts__relative_leg_efficiency.pine`
- `sources/0740__mihakralj-QuanTAlib__median.pine`
- `sources/0978__helenananaa-pine-compat-runtime__unsupported_array_sort_box.pine`

### `strategy()` CamelCase `initialCapital` (7)

Representative row: `sources/0640__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.0.pine`, v5, line 20: `initialCapital = 50000`.

Minimal repro:

```pine
//@version=5
strategy("initialCapital spelling", overlay=true, initialCapital=50000)
plot(close)
```

Pinned rows:

- `sources/0640__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.0.pine`
- `sources/0641__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.1.pine`
- `sources/0642__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.4_exec-gap.pine`
- `sources/0648__knectardev-pine_scripts__v2.5.6_v2.5.7.pine`
- `sources/0654__knectardev-pine_scripts__momentum-breakout-strategy_v1.0.0.pine`
- `sources/0655__knectardev-pine_scripts__momentum-breakout-strategy_v1.1.0_volume-filter.pine`
- `sources/0656__knectardev-pine_scripts__momentum-breakout-strategy.pine`

### Unresolved Identifier / Source Context Rows (7)

Representative row: `sources/0151__mihakralj-pinescript__sam.pine`, v6, line 31: `float ji = ... nz(ji[1]) ...`.

Minimal repro for the self-history member:

```pine
//@version=6
indicator("self history local")
f(series float src) =>
    float ji = src + nz(ji[1])
    ji
plot(f(close))
```

Other representative shapes:

```pine
//@version=6
indicator("late module declaration")
f() =>
    while array.size(array.from(close)) > pivotsToKeep
        break
    close
int pivotsToKeep = input.int(21)
plot(f())
```

Pinned rows:

- `sources/0151__mihakralj-pinescript__sam.pine` — self-referential local history (`ji`, also `jq`).
- `sources/0489__casoon-pine-scripts__flow_bias.pine` — generated combined source references `rsiLen` before a visible declaration.
- `sources/0495__casoon-pine-scripts__wave_navigator.pine` — generated module block references `pivotsToKeep` before the later input declaration.
- `sources/0581__casoon-pine-scripts__vein_reversal_zones.pine` — references `relVol`, which is not declared in the pinned standalone source.
- `sources/0772__milocaetano-quantick__delta_histogram.pine` — incomplete standalone snippet references undeclared `delta`.
- `sources/0773__suyons-tradingview-indicators__02-rsi-signal.pine` — references undeclared `buy` instead of local `buy_signal`.
- `sources/0952__chauhanvishaal-tv-indicators__Zone_Identifier.pine` — `na(float)` parsed as an unresolved identifier.

### Series Value Passed To `simple` UDF Parameter (4)

Representative row: `sources/0157__mihakralj-pinescript__binomdist.pine`, v6, line 52: `lnBinom(n, i)` where `i` is the loop counter.

Minimal repro:

```pine
//@version=6
indicator("simple udf argument")
f(simple float x) => x
plot(f(close))
```

Pinned rows:

- `sources/0157__mihakralj-pinescript__binomdist.pine`
- `sources/0166__mihakralj-pinescript__gammadist.pine`
- `sources/0185__mihakralj-pinescript__poissondist.pine`
- `sources/0535__casoon-pine-scripts__vwap_cross_visuals.pine`

### `calc_on_order_fills=true` Trace-Required Refusal (3)

Representative row: `sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine`, v6, line 24: `calc_on_order_fills = true`.

Minimal repro:

```pine
//@version=6
strategy("fill re-entry", calc_on_order_fills=true)
strategy.entry("L", strategy.long)
```

Pinned rows:

- `sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine`
- `sources/0610__casoon-pine-scripts__vein_reversal_labeler_strategy.pine`
- `sources/0611__casoon-pine-scripts__wavetrend_v4_strategy.pine`

### Execute-Stage Array/Matrix Bounds Under Realistic Data (2)

Representative row: `sources/0272__mihakralj-pinescript__polyfit.pine`, v6, line 79: `for row = col + 1 to d`.

Minimal repro:

```pine
//@version=6
indicator("descending empty range")
for row = 3 to 2
    plot(row)
```

Pinned rows:

- `sources/0272__mihakralj-pinescript__polyfit.pine` — matrix pivot loop indexes past a 3x3 matrix when the documented descending-loop rule executes `3 to 2`.
- `sources/0520__casoon-pine-scripts__sr_zones_mtf_v2.pine` — support/resistance zone array remains empty, then `array.get(_scores, 0)` is reached.

### Local `request.security` Without `dynamic_requests=true` (1)

Representative row: `sources/0858__regalouisei-collect-tradingview__tabela-rsi-5-emas-dd.pine`, v5, line 25: local helper-gated `request.security(...)`.

Minimal repro:

```pine
//@version=5
indicator("local request")
f() => request.security(syminfo.tickerid, "5", close)
plot(f())
```

### Invalid Table Position Enum Probe (1)

Representative row: `sources/0979__helenananaa-pine-compat-runtime__unsupported_table_set_position_values.pine`, v5, line 4: `table.set_position(id, "position.bad")`.

Minimal repro:

```pine
//@version=5
indicator("bad table position")
id = table.new(position.top_right, 1, 1)
table.set_position(id, "position.bad")
```

## Fixture Design Signal

The realistic fixture did not produce a new broad cluster around pivots, volume, multi-year state, or long lookbacks inside these 34 current gaps. Its strongest positive signal is recovery: `0491`, `0530`, and `0618` move from empty-array execute failures to visible output; `0511`, `0759`, and `0769` move from gated/synthetic-window silence to standard-window output. Those are exactly the branches the old fixture was too short or too tame to exercise.

The remaining fixture-sensitive tail is `0272` and `0520`. Both are still execute-stage array/matrix failures after realistic bars, but they are narrow compared with the semantic/code-surface groups above.
