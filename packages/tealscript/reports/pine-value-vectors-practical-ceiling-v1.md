> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Practical Ceiling V1

Superseded metric notice: this document established the practical denominator
(`471/489`) at v18. Its `294/489` coverage figure is historical. Quote
`pine-value-vectors-index-v1.md` for the authoritative value-vector figures.

Source reports:

- `pine-value-vectors-blind-spot-v18.md`
- `pine-builtin-completeness-audit-v1.md`
- `pine-rolling-na-policy-audit-v1.md`

## V18 Baseline Coverage

- Raw audited builtin denominator: `489`.
- Independent-oracle value-covered members: `294/489` (`60.12%`).
- Remaining raw members without independent-oracle value vectors: `195`.

The remaining `195` are not mostly provider-only or impossible. They are
dominated by two locally-testable classes:

- Visual/drawing/table object surface: setters, getters, copies, deletion,
  constants and output metadata. These need object/output-state assertions for
  some members, not TradingView traces.
- Strategy/order/risk surface: broker variables, order-management effects,
  risk rules and trade accessors. Most are locally testable with deterministic
  bars, but exact fill-triggered re-entry and broker edge models remain
  trace-required.

## Practical Ceiling Without TradingView Traces

| Bucket | Members | Status |
| --- | ---: | --- |
| Already independently value-covered | `294` | Covered by the current value-vector runner. |
| Locally verifiable in principle, not yet covered | `177` | Add numeric vectors, object-state vectors, or synthetic host/provider fixtures. |
| TradingView-trace-required or host-provider exactness required | `18` | Do not guess; needs TradingView traces or host/provider contracts. |
| Total | `489` |  |

Practical no-trace ceiling for member-level value coverage is therefore
`471/489` (`96.32%`). That ceiling does not mean full semantic parity: edge
cases inside already-covered members can still require traces, as the rolling
`na` audit showed.

## Remaining Raw Surface Shape

| Remaining class | Approximate share of remaining `195` | Why it remains |
| --- | ---: | --- |
| Visual/drawing/table/linefill/polyline/chart-point state | largest | Many members are object mutations or metadata, so numeric plot-only vectors are insufficient. |
| Strategy order/risk/trade state | large | High blast radius; deterministic subsets are local, but fill-triggered re-entry and exact broker edge models need traces. |
| Request/session/timeframe/ticker/symbol context | moderate | Mostly synthesizable with seeded datafeeds and alternate runtime metadata. |
| Cosmetic constants/string/color residues | small | Low blast radius and straightforward to cover later. |
| Provider-only / exact TradingView trace | small | Not a reason to stop at 60%; it is the actual no-trace ceiling. |

## Trace-Required Examples

- `strategy(calc_on_order_fills=true)`: TradingView recalculates immediately
  after fills; TealScript currently rejects it loudly pending fill-triggered
  re-entry trace parity.
- Broker edge models such as exact margin liquidation timing,
  `risk_free_rate`-dependent metrics, and standard-OHLC fill selection need
  TradingView-backed traces before they should be asserted as exact.
- Undocumented TA edge behaviour remains trace-required at the edge-case level
  even when the member has a normal-path vector.
- Exact exchange calendars, event feeds and future provider series require
  host/provider contracts; synthetic fixtures can test merge mechanics but not
  external data truth.

## Reporting Rule

Future value-vector reports should state both:

- raw coverage: covered members divided by `489`;
- practical no-trace coverage: covered members divided by `471`.

At v18, that is `294/489` (`60.12%`) raw and `294/471` (`62.42%`) against the
current practical no-trace ceiling.
