> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Saturation V1

Inputs:

- Baseline report: 844/925 = 91.24%.
- Current rerun: `external-pine-corpus-v5-rerun-de08b99574-v1.md`.
- Current committed HEAD: `de08b9957438c00cb8ed1d7fa162fca9059ad6e5`.

## Finding

The fixed v5 corpus is saturated for value-level correctness.

After multiple engine fixes for value semantics, the pinned corpus moved from
844/925 to 843/925. The only row-level delta was
`sources/0467__everget-tradingview-pinescript-indicators__roi_return_on_investment.pine`,
which moved from visible output to
`output-silence:global-output-declared-but-not-evaluated`.

The value-vector harness found and protected wrong-number defects that the
corpus did not move for:

- UDF call-site scope/history.
- RMA/ATR missing-value state.
- ALMA floor/window semantics.
- Strategy entry-ID replacement.
- `max_bars_back` value behavior.
- `calc_on_order_fills` strategy behavior.
- Lower-timeframe lookahead selection.

## Interpretation

The corpus primarily measures whether a script parses, checks, executes, and
produces counted output. It does not prove the produced numeric series are
Pine-correct. A stable or falling corpus support count after value-semantic
fixes is evidence that this corpus is no longer sensitive to the most valuable
class of remaining engine defects.

Further value work should be driven by independent value vectors and targeted
semantic probes, not by grinding the current corpus tail alone.
