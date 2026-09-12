# Pine Trace-Required Register v1

Primary references are the [Pine v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/),
[plots documentation](https://www.tradingview.com/pine-script-docs/visuals/plots/),
[lines and boxes documentation](https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/),
and [colors documentation](https://www.tradingview.com/pine-script-docs/visuals/colors/).

This register lists Pine behaviors that cannot be established from the public
reference manual and the current TealScript implementation alone. “Trace” does
not mean “probably unsupported”: the language path may be implemented and
tested while the exact reference behavior remains unverified.

## Priority And Evidence

Priority is the estimated blast radius for a normal pasted indicator or
strategy. The evidence column names the smallest observation that would settle
the behavior. A trace must record the declared Pine version, symbol, timeframe,
exchange session, input values, bar timestamps, OHLCV, and per-bar outputs.

| Rank | Surface | Why current evidence is insufficient | Evidence that settles it | What remains blocked |
| ---: | --- | --- | --- | --- |
| 1 | `request.security` on an unclosed higher-timeframe bar | The manual specifies `gaps` and `lookahead` modes, but exact live-bar selection and repaint timing depend on the provider's update schedule. Historical fixtures cannot observe an unclosed bar. | A timestamped realtime recording containing chart-bar updates, HTF confirmations, requested values, `gaps`, and `lookahead` variants. | Realtime MTF indicators, repaint diagnostics, and exact alert/strategy behavior. |
| 2 | Broker-emulator sequencing without intrabar data | TradingView documents synthesized OHLC traversal, but order activation, same-bar fills, and sequencing across multiple orders are path-dependent. | A strategy trace with every order event, synthesized/intrabar tick, fill, position state, and equity event on bars with and without lower-timeframe data. | Exact `strategy.entry/exit/order`, OCA, pyramiding, and risk results. |
| 3 | `calc_on_order_fills` and fill-triggered re-entry | The declaration is accepted and the historical engine models ordinary fills, but the exact extra execution order and rollback behavior are not derivable from signatures. | A strategy trace marking each bar execution reason (`bar`, `order_fill`, `tick`) and all state/drawing outputs after each reason. | Strategies that enter, mutate state, or draw in response to fills. |
| 4 | Realtime `barstate` and rollback | `barstate.isrealtime`, `isconfirmed`, `islast`, and `islastconfirmedhistory` depend on feed updates and confirmation. `varip` intentionally escapes some rollback. | Repeated same-timestamp updates followed by confirmation, with values and state snapshots for each update. | Realtime indicators, `varip`, realtime alerts, and incremental drawing correctness. |
| 5 | Realtime `alert`/`alertcondition` scheduling | Frequency selection and UI alert settings are external to script evaluation; historical execution cannot establish whether a condition fires once per bar, close, or update. | A live alert recording containing script condition values, selected UI frequency, bar updates, and emitted alert timestamps/messages. | Exact alert delivery and message-template parity. |
| 6 | Provider-backed `request.*` series | `request.currency_rate`, economic, financial, corporate-action, seed, and synthetic ticker values depend on provider revisions, missing observations, and alignment policy. Seeded in-memory fixtures prove plumbing, not production data parity. | Versioned provider fixture with raw observations, revisions, timezone, gaps, currency, ticker modifiers, and normalized returned series. | Production values for provider-dependent indicators and all exact synthetic-ticker outputs. |
| 7 | Exchange calendars and session irregularities | Session strings are deterministic, but holidays, early closes, DST transitions, and exchange-specific pre/post-market definitions are host data. | Provider calendar fixture spanning DST, holiday, early close, and regular/extended sessions, with `time()`/`time_close()` results. | Exact `session.*`, time filters, and session-gated MTF indicators. |
| 8 | Interactive `input.*` confirmation | `confirm=true` changes UI interaction and when a value becomes available; static execution only checks the default and supplied override. | UI session recording showing input dialog, accepted value, cancel path, rerun timing, and resulting series. | Exact interactive input behavior and scripts depending on confirmation timing. |
| 9 | `request.security_lower_tf` array alignment | The language contract identifies lower-timeframe arrays, but exact intrabar grouping, partial final groups, missing bars, and provider limits require source data. | Lower-timeframe provider fixture with explicit intrabar timestamps and missing intervals, compared to returned arrays per chart bar. | Exact lower-timeframe arrays, volume-profile indicators, and intrabar strategy logic. |
| 10 | Undocumented `na` policies in stateful builtins | Approximately 40 builtins have no sufficiently explicit rule for interior `na`, seed selection, or recovery. Clean formulas and existing implementation cannot establish reference behavior. | Per-function reference vectors containing leading `na`, interior holes, all-`na`, zero, and recovery segments, independently captured or derived from an authoritative trace. | Numerical value parity for those functions and any composed indicator using them. |
| 11 | Chained smoother warm-up (`ta.dema` and related) | A single EMA seed rule does not prove the warm-up and `na` propagation of two chained smoothers. | Long vector with leading/interior `na`, explicit first-valid indexes, and both intermediate and final series. | Exact DEMA/TEMA-style values and dependent indicators. |
| 12 | `ta.allTimeHigh` / `ta.allTimeLow` | The running-extrema concept is clear, but initialization and `na` handling over holes are not specified precisely enough for a value claim. | Vector with leading and interior holes, new extrema, repeated values, and post-hole recovery. | Exact all-time extrema values. |
| 13 | `request.volume_delta` | The provider supplies intrabar volume classification and the reference's aggregation is not recoverable from chart OHLCV alone. | Provider fixture with every intrabar trade/volume bucket and expected returned delta/percent series. | Volume-delta indicators and alerts. |
| 14 | Object lifecycle under realtime rollback | Historical object limits and deletion are testable, but object identity, rollback, and persistence of objects created during replaceable bars require realtime observations. | Realtime trace of object IDs, creation/update/delete calls, rollback snapshots, and confirmed-bar survivors. | Exact labels, lines, boxes, polylines, and tables on live bars. |
| 15 | Drawing limit and `max_bars_back` interaction | Limits and historical buffering are documented separately; their interaction when objects reference distant bars is not fully specified. | Long-bar trace varying declaration limits, history references, object creation points, and resulting errors/evictions. | Exact edge behavior for drawing-heavy indicators. |
| 16 | Provider forecast/future fields | Future corporate-action and recommendation fields have freshness and revision semantics that are provider-owned, not language-defined. | Versioned provider snapshots including announcement, estimate, revision, and publication timestamps. | Future dividend/earnings/recommendation series. |

## Builtin `na` Trace Set

The approximate count of 40 is a behavior count, not 40 missing names. It
covers implemented functions whose signatures and ordinary formulas are known
but whose interior-hole, all-hole, or seed behavior is not authoritative in the
manual. The set is maintained from the value-vector blind-spot reports and
must not be converted into guessed expectations. A function leaves this set
only when an independently justified vector or a reference trace specifies:

- leading warm-up bars and the first valid bar;
- treatment of an interior `na` and recovery after it;
- zero-length, length-one, and length-greater-than-history inputs where valid;
- state reset or preservation across bars and call sites; and
- compiled output matching the same vector.

## Evidence Already Available

- Historical deterministic vectors establish ordinary formulas for 87 of 489
  builtin names and 74 of 74 core `ta.*` names have independent value coverage
  in the current vector program. This does not resolve the trace-required
  surfaces above.
- The compiled engine is the production TealScript path. Historical product
  and realtime replay gates prove the fields they compare; they do not prove
  realtime provider or broker-emulator behavior that they never observe.
- `packages/tealscript/STRATEGY_INTRABAR_DESIGN.md` records the existing
  synthesized-tick model and lower-timeframe data contract.
- `packages/tealscript/TICKER_DATA_DESIGN.md` records provider and synthetic
  ticker constraints.
- `packages/tealscript/reports/pine-value-vectors-blind-spot-v2.md` records the
  independent-oracle ceiling and its current realtime `varip` limitation.
- `packages/tealscript/src/runtime/requestDatafeed.ts` is the deterministic
  provider seam; production adapter behavior still needs provider fixtures.

## Decision Use

The highest-value acquisition is one synchronized realtime recording that
captures HTF/LTF requests, barstate, alerts, and strategy fill events. Provider
fixtures are the next priority because they can establish request values
without TradingView. Historical vectors remain the cheapest way to reduce the
stateful-builtin list, but they cannot settle feed scheduling, UI interaction,
exchange-calendar, or broker-emulator questions.
