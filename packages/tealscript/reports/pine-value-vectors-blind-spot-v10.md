> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V10

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source report: `pine-value-vectors-coverage-v89.md`.

## Summary

- Independent-oracle value-vector cases: `317`.
- Passing protected cases: `315`.
- Expected engine defects still tracked: `2`.
- Unexpected failures: `0`.
- Unexpected passes: `0`.
- Context-sensitive cases by static source/options scan: `61/317`.

The fixture-profile comparison found `144/1000` corpus rows whose observable
payload or classification changed between daily and context-stress bars. The
value-vector suite is therefore a single-chart-context oracle: it proves the
listed formulas in the contexts they encode, not across every chart context a
real script can observe.

## Coverage Fractions

| Surface | Independent-oracle coverage | Fraction | What remains outside the oracle |
| --- | ---: | ---: | --- |
| Core committed `ta.*` names | 74 of 74 names | 100.00% | More hostile shapes per name, especially undocumented edge behaviour. |
| Official `TradingView/ta` library exports currently implemented | 13 of 13 names | 100.00% | Version-specific trace checks where docs omit exact edge behaviour. |
| Runtime/language checklist | 22 of 23 categories | 95.65% | Realtime `varip` replacement semantics needs a realtime value oracle. |
| Requested builtin completeness audit surface | 227 of 489 documented members have at least one value vector | 46.42% | Most visual metadata, table, session, ticker edge cases, timeframe edge cases and strategy accessors are still checked for existence/signature, not independent value semantics. |

## Context-Sensitive Vectors

| Context dependency | Cases | Pine rule interpretation |
| --- | ---: | --- |
| Long-history or bar-count-sensitive formulas | 33 | Should differ when the bar window changes; the oracle is tied to its specified bars. |
| Volume-regime formulas | 22 | Should differ when volume changes; these include volume indicators and volume-weighted calculations. |
| Intraday time/session/calendar values | 5 | Should differ when timestamps, timeframe flags, or session windows change. |
| Request-context values | 5 | Should differ when the request datafeed or chart/request timeframe mapping changes. |
| Realtime-only state | 3 | Historical vectors cannot prove live replacement semantics; these require a realtime value oracle. |
| Tick precision or symbol metadata | 2 | Should differ when `syminfo.*` or ticker metadata changes. |
| 24/7 or weekend/session mode | 2 | Should differ when the chart has weekend bars or a different session model. |

Counts overlap because one vector can depend on multiple context axes.

## Cases That Should Differ By Pine Rules

- `runtime.syminfo-values` and `runtime.ticker-transform-values` are host
  metadata checks; changing symbol or tick metadata must change expected values.
- `runtime.timeframe-values`, `runtime.calendar-fields`,
  `runtime.timestamp-and-time-values`, and `runtime.session-state-values` are
  chart-time checks; changing intraday timestamps, timeframe flags, or sessions
  must change expected values.
- `request.*` vectors are request-datafeed checks; changing provider bars,
  event feeds, or timeframe mapping must change expected values.
- Volume and long-history `ta.*` vectors are formula checks over fixed bars;
  changing OHLCV or bar count changes the input sequence and therefore the
  expected series.

## Cases That Would Indicate A Context-Sensitivity Bug

- Price-only arithmetic, `math.*`, `str.*`, and language-scope vectors should
  not change merely because symbol metadata, session metadata, or timeframe
  flags change while their OHLC inputs stay fixed.
- TA vectors that do not read volume should not change from volume-regime
  changes alone.
- Historical vectors should not be used to assert realtime `varip`,
  unconfirmed-bar replacement, or intrabar order/alert semantics.

## Trace-Only Or Host-Dependent Remainder

- Realtime tick replacement and intrabar alert/order timing remain outside the
  historical value-vector runner.
- Real symbol metadata and exact exchange calendars remain host-dependent.
- Corporate actions, fundamentals, economic data, Quandl, and seed requests
  require host-provided event feeds or TradingView traces.

## Conclusion

`61/317` vectors are intentionally context-sensitive. That sensitivity is
correct where Pine exposes the chart context as data, but it limits the scope of
the independent oracle: the suite now protects a broad language and builtin
surface in one controlled set of chart contexts, while realtime traces, real
symbol metadata, event feeds, and exchange calendars remain separate evidence
requirements.
