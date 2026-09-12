> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors ATR Readjudication V1

Source report: `pine-value-vectors-coverage-v81.md`.

## Finding

`hostile.atr.middle-na` and `hostile.atr.multi-middle-na` were oracle errors,
not engine defects.

TradingView's v6 reference states that `ta.atr(length)` uses RMA smoothing over
true range, and `ta.rma(source, length)` ignores `na` values in `source` and
calculates over the required count of non-`na` values. The correct ATR series
therefore carries the prior RMA value through an interior `na` true-range bar
instead of emitting `na` on that bar.

## Evidence

- `hostile.atr.middle-na`: previous oracle expected `na` on bar 5; compiled and
  public execution both emitted the prior ATR value `3.185185185185185`.
- `hostile.atr.multi-middle-na`: previous oracle expected `na` on bars 7 and
  10; compiled and public execution both emitted the prior ATR values
  `3.7283950617283956` and `2.7681755829903985`.
- After correcting the oracle, both ATR cases pass and are removed from
  `EXPECTED_VALUE_VECTOR_FAILURES`.

## Follow-On

`hostile.supertrend.middle-na` also moved because it depends on the ATR oracle.
That case still emits `na` on the bar whose current high/low/close are `na`,
which is correct for the current-bar supertrend calculation even though the ATR
state itself carries forward.
