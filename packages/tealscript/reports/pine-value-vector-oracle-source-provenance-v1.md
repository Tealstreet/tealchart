# Pine Value Vector Oracle Source Provenance V1

Superseded by `pine-value-vector-oracle-source-provenance-v2.md`. Historical measurement only.

Measurement commit: `c9423c6c4e`.

## Finding

The committed reference snapshot is not an oracle source for any passing
value-vector expectation. It affects member-name validation and coverage
denominators, not the expected value formulas.

## Method

- Source: `packages/tealscript/scripts/run-pine-value-vectors.ts` at current HEAD.
- Classification: cases whose `rule` text cites `tradingview.com` are
  live-doc-cited.
- Classification: cases whose `rule` text names the committed snapshot,
  signature table, or manual index are snapshot-cited.
- Classification: cases with no per-case `rule` text are
  local-formula-no-citation. They are still independent of the TealScript engine
  and do not cite the snapshot, but their live documentation source is not
  recorded at the case boundary.
- `math.clamp` is a TealScript local extension, so it is tracked separately from
  official TradingView sources.

## Headline

| Scope | Live-doc-cited | Local formula, no per-case citation | Local extension | Snapshot-cited |
| --- | ---: | ---: | ---: | ---: |
| Passing cases | `703` | `201` | `1` | `0` |
| All cases | `708` | `201` | `1` | `0` |
| Expected-red cases | `5` | `0` | `0` | `0` |

## Interpretation

- Snapshot corruption has narrow value-oracle blast radius: `0/905` passing
  cases derive their expected values from the committed snapshot.
- Snapshot corruption can still corrupt names, signatures, denominators and
  depth accounting. The `matrix.sort:sort_field` defect was that class.
- The remaining provenance weakness is citation quality, not engine
  independence: `201` older local-formula cases should eventually receive
  per-case live-doc citations, but they are not frozen engine outputs and they
  are not snapshot-derived.

## Sample Local-Formula Cases Without Per-Case Citation

- `ta.sma`
- `ta.ema`
- `ta.dema`
- `ta.tema`
- `ta.hma`
- `ta.tsi`
- `ta.rma`
- `ta.smma`
- `ta.rsi`
- `ta.stdev`
- `ta.variance`
- `ta.atr`
- `ta.wma`
- `ta.dev`
- `ta.highest`
- `ta.lowest`
- `ta.vwma`
- `ta.cum`
- `ta.change`
- `ta.barssince`
- `ta.valuewhen`
- `ta.crossover`
- `ta.crossunder`
- `ta.cross`
- `ta.rising`
