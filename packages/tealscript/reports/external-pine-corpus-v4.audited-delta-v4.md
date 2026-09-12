> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# V4 Audited Delta V4: Normalization Correction

The `523 / 558` headline in V3 was wrong. It omitted the four rows already
classified by the committed behavior audit as `supported-correct-silence`:

| Row | Current raw result | Audited result |
| --- | --- | --- |
| `0085` | output silence; plots are `display.none` | supported |
| `0351` | output silence; plot is `display.none` | supported |
| `0429` | output silence; plots are `display.none` | supported |
| `0593` | output silence; plot is `display.none` | supported |

These rows did not lose support and no commit caused a regression in them. The
correct current audited headline is therefore **527 / 558 (94.44%)**, unchanged
from the previous audited result. The earlier V3 report has been superseded by
this correction; its `523 / 558` value was an instrument error.

## Row-Level Changes Actually Observed

The before/after comparison against the parent before the four requested fixes
shows eight changed rows, not four lost supported rows:

| Row | Before | After | Attribution |
| --- | --- | --- | --- |
| `0111` | box receiver semantic gap | produced output | `2b33125519`, drawing receiver binding |
| `0571` | array bounds runtime error | produced output | `b69f4de54c`, array history semantics |
| `0120` | line receiver semantic gap | later Pivot Points runtime error | `2b33125519`, receiver resolution advanced the row |
| `0393` | array bounds runtime error | array type semantic diagnostic | `b69f4de54c`, array history/type checking advanced the row |
| `0279` | output silence with hidden array issue | array type semantic diagnostic | `b69f4de54c` plus current checker state |
| `0468` | output silence/undecided | `str.split` type diagnostic | current checker state; no committed attribution in this run |
| `0171` | produced output | `label.set_xy()` argument-count diagnostic | current dirty source state; no committed attribution in this run |
| `0226` | produced output | duplicate `table.cell()` argument diagnostic | current dirty source state; no committed attribution in this run |

The worktree had uncommitted source edits during the current rerun, so the last
three diagnostic changes cannot honestly be assigned to a commit. They are not
evidence for an extrema-warmup regression. The extrema change was already
covered independently by the value-vector harness; no corpus row in this run
demonstrated a support loss caused by its warmup behavior.

## Corrected Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus \
  --input /tmp/pine-corpus-v4-rerun-no-timeout \
  --output /tmp/pine-corpus-v4-rerun/report-20260905-after-hostile-rerun.json
```

Apply the committed parse, behavior, and follow-up audits, then restore timeout
row `0254` to the 650-row universe. Add the four behavior-audit
`supported-correct-silence` rows to raw supported before calculating the 558-row
headline.
