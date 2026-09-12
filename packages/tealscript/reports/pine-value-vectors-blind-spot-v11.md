> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V11

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `pine-value-vectors-coverage-v89.md`
- `pine-value-vector-context-comparison-v1.md`
- `external-pine-corpus-v5.fixture-profile-delta-v2.md`

## Summary

- Independent-oracle value-vector cases: `317`.
- Context-sensitive cases run under a second chart context: `61`.
- Changed and should have: `25`.
- Unchanged and should have: `0`.
- Changed when should not have: `0`.
- Unchanged and should not have: `36`.
- Not comparable: `0`.

The second context uses the same OHLC sequence and bar count for each vector,
but changes timestamps to continuous 15-minute 24/7 bars, changes symbol/tick
metadata, and varies volume regimes. The split is clean: every changed vector
changed on a context axis Pine exposes as data, and no vector changed on a
context axis it should ignore.

## Context Classes

| Context class | Rows |
| --- | ---: |
| bar_count_long_history | 32 |
| volume_regime | 22 |
| intraday_time_session | 6 |
| request_context | 5 |
| realtime_only | 3 |
| tick_precision_symbol | 2 |
| twentyfour_seven_weekend | 2 |

Counts overlap because one vector can depend on multiple context axes.

## Interpretation

- `25` vectors now have cross-context evidence: the value changed under
  intraday/24-7/tick/volume/request context and Pine rules say it should.
- `36` vectors stayed stable under the alternate context and Pine rules say they
  should: they are long-history, historical `varip`, or formula cases whose
  tested output does not read the changed context axis.
- `0` vectors exposed context-sensitivity defects.

## Remaining Limits

- Realtime `varip`, unconfirmed-bar replacement, live rollback, and intrabar
  alert/order timing remain outside this historical vector runner.
- Real symbol metadata still requires host metadata or traces; this runner only
  proves behavior for synthetic metadata profiles.
- Event-backed requests and exact exchange calendars still require host feeds or
  TradingView traces.

## Conclusion

The `61` previously narrow context-sensitive value-vector claims are now
verified across a second synthetic chart context. This does not remove
trace-only requirements, but it does close the single-context weakness for the
vectors whose context dependency can be synthesized locally.
