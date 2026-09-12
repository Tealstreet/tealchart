# Pine Value Vector Live Reference Denominator V2

> Superseded by `pine-value-vector-live-reference-denominator-v3.md`. Historical measurement only.

Measurement commit: `ad7d956139`.

## Finding

The live-reference correction from v1 still gives the right total live
denominator, but its ownership wording was wrong. The `25` live-documented
callable names absent from the committed snapshot are not missing
implementations and are not locally-vectorable gaps. They are already classified
as trace/host, declaration, provider, pseudo-random, or intentional-error
surfaces in the member map.

## Headline

| Denominator | Covered | Total | Coverage | Meaning |
| --- | ---: | ---: | ---: | --- |
| Committed snapshot | `813` | `861` | `94.43%` | Coverage against the checked-in artifact used by existing member maps. |
| Snapshot plus live-reference callable correction | `813` | `886` | `91.76%` | Current total-member answer to how much live-documented Pine member surface has value-vector coverage. |
| Practical no-trace denominator | `813` | `813` | `100.00%` | Excludes the trace/host/declaration/error-bound names that cannot receive deterministic local value vectors. |

## Ownership Split For The 25 Live-Only Names

| Classification | Count | Owner |
| --- | ---: | --- |
| Not implemented | `0` | No parser/runtime handoff from this set. |
| Implemented but locally vector-coverable | `0` | No value-vector work from this set. |
| Implemented but trace/host/declaration/error-bound | `25` | Remains in trace/host or non-value classification. |

Direct engine probes against the current tree checked each of the `25` names
against parser, semantic binding, compilation through the public compiled
wrapper, and execution. Provider-backed names executed when supplied with seeded
request data. `runtime.error` intentionally surfaces its error, and `library` is
a declaration form rather than a successful value-output member.

## Implemented Evidence-Bound Names

| Member | Classification reason | v5/v6 corpus usage |
| --- | --- | ---: |
| `runtime.error` | Intentional runtime exception surface, not a successful value-output member. | `395` scripts / `571` refs in direct v5/v6 source scan; `433` scripts / `640` refs in the 2,506-script depth report. |
| `library` | Declaration form, not an executable value member. | `26` scripts / `26` refs in direct v5/v6 source scan. |
| `math.random` | TradingView pseudo-random sequence needs trace parity rather than a guessed oracle. | `2` scripts / `10` refs in direct v5/v6 source scan. |
| `request.seed` | Provider-backed seed data. | `2` scripts / `4` refs in direct v5/v6 source scan. |
| `strategy.risk.max_intraday_filled_orders` | Exact strategy risk halt and forced-exit timing needs TradingView broker-emulator/session traces. | `2` scripts / `2` refs in direct v5/v6 source scan. |
| `request.footprint` | Provider footprint data. | `0` refs in direct v5/v6 source scan. |
| `request.quandl` | Provider-backed Quandl data. | `0` refs in direct v5/v6 source scan. |
| `strategy.risk.max_cons_loss_days` | Exact strategy risk halt and forced-exit timing needs TradingView broker-emulator/session traces. | `0` refs in direct v5/v6 source scan. |
| `footprint.buy_volume` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `footprint.delta` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `footprint.get_row_by_price` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `footprint.poc` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `footprint.rows` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `footprint.sell_volume` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `footprint.total_volume` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `footprint.vah` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `footprint.val` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `volume_row.buy_volume` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `volume_row.delta` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `volume_row.down_price` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `volume_row.has_buy_imbalance` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `volume_row.has_sell_imbalance` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `volume_row.sell_volume` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `volume_row.total_volume` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |
| `volume_row.up_price` | Provider footprint row data. | `0` refs in direct v5/v6 source scan. |

## Correction To V1

`pine-value-vector-member-map-v30.json` stores `traceOrHostRequired` entries as
objects (`{ member, reason }`). V1 treated that array as strings when checking
whether live-only names were already classified, so all `25` were reported as
new uncovered names. Normalizing those entries shows all `25` were already in
the trace/host/declaration/error-bound side of the register.

Use `813/886` (`91.76%`) for total live-reference member coverage. Use
`813/813` (`100.00%`) for practical deterministic no-trace value coverage. Do
not dispatch these `25` as missing implementations.
