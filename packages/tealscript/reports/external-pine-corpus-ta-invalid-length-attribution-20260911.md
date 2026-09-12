# External Pine Corpus TA Invalid-Length Attribution 2026-09-11

Date: 2026-09-11

This follows up the pre-measurement prediction in
`external-pine-corpus-acceptance-change-prediction-20260911.md`.

Corpus lane measured at `4b915fcb75`:

- 43 formerly-producing rows now fail on TA invalid-length refusal.
- 9 formerly-producing rows now fail on one of the propagated Pine runtime
  errors.
- 2 previously-silent rows now emit TA invalid-length refusals.
- Net output movement across v5/v6/v7: -25 rows.

The swallowed-error prediction was close. The TA-length prediction was wrong by
more than an order of magnitude. That miss was informative: invalid TA lengths
were not rare corpus fixtures.

## Reconstruction Scope

The exact 43-row delta artifact was not present in this checkout. I reran the
current v5/v6/v7 corpus caches available under the aimux worktrees and filtered
for rows whose execution result or swallowed-error profile mentioned a positive
integer TA length refusal.

Before the fix below, the local reconstruction found 50 current rows carrying
TA-length diagnostics:

- v5: 22
- v6: 21
- v7: 7

Those counts are not a replacement for the corpus lane's measured 43-row output
delta. They are the row sample used here to explain where the invalid lengths
came from.

## Finding

The largest bucket was not author-written invalid lengths. It was a generated
code ordering defect exposed by the new refusal.

Generated expression-source series for optimized `ta.sma(...)` calls were
updated at the top of `onBar`, before the script body assigned input-backed
declarations used by nested source expressions. Public stochastic shapes such
as:

```pine
k = sma(stoch(src, high, low, periodK), smoothK)
```

therefore constructed the nested `stoch` instance with the previous value of
`periodK`. On the first bar that value was `na`. The old silent TA-length
coercion converted that `na` to a plausible length; the new refusal exposed it
as:

```text
TA length must be a positive integer; got na.
```

After moving those hidden source-series updates to the actual call site, 33 of
the 50 reconstructed current diagnostics disappeared:

- v5: 22 -> 6
- v6: 21 -> 4
- v7: 7 -> 3

Representative rows that now pass:

- `sources/0450__everget-tradingview-pinescript-indicators__stochastic.pine`
- `sources/0711__tarasprystavskyj-top__Breakout-AVAAI-BITGET.pine`

That means the original prediction missed two things:

- Real scripts do compute invalid TA lengths more often than expected.
- Removing silent normalization also uncovered a separate compiled ordering bug
  that made valid input-backed lengths look invalid.

## Remaining Invalid-Length Shapes

Among the reconstructed rows still carrying TA-length diagnostics after the
ordering fix, the dominant author-code shape is fractional dynamic length.

| Shape | Count | Examples | What the author sees |
| --- | ---: | --- | --- |
| Fractional dynamic length from arithmetic | 8 | HMA-style `length / 2`; timeframe ratios such as `timeframe.in_seconds("15") / timeframe.in_seconds(timeframe.period)` | `got 4.5`, `got 27.5`, `got 32.5`, or `got 0.25` |
| Literal or fixture zero/negative invalid length | 3 | `ta.stoch(..., 0)`, `ta.bb(close, 0, 2)`, `ta.change(close, 0)` | `got 0` |
| Request-expression profile error | 2 | TA calls inside `request.security(...)` replay | one `got 4.5`; one still `got na` and remains row-trace-worthy |

The real-world idiom worth remembering is fractional smoothing, especially HMA
variants. Pine authors often write `length / 2` where TradingView requires an
integer length argument. The actionable fix is to choose the intended rounding
explicitly, e.g. `math.floor(length / 2)`, `math.round(length / 2)`, or another
positive-integer guard.

The zero-default "0 to disable" idiom was checked separately. Generated
`and`/`or` is lazy, and the representative guarded strategy row passes after
the call-site ordering fix, so that pattern was not a boolean eagerness defect.

## Message Change

The runtime refusal now includes the offending value and a fix-oriented hint:

```text
TA length must be a positive integer; got <value>. TradingView rejects zero,
negative, fractional, and na lengths, so guard computed lengths or add one
before calling TA functions
```

That is intentionally louder than the previous generic refusal. A user whose
script now fails can see whether they produced `0`, a fractional value such as
`4.5`, or `na`, and the message states the TradingView rule directly.

