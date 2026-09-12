> Superseded by external-pine-corpus-v4.pinned-regression-v2.md. Historical measurement only; use the superseding report for current figures.

# V4 Pinned Regression Bisect V1

All measurements below were run from git-archive exports with the same fixed
649-row no-timeout input. No shared-checkout files were used by the runner.

## Culprit

The three-row semantic decrease occurs at **`b69f4de54c`**:

`fix(tealscript): use Pine array history semantics`

The semantic funnel changes from `545` at `d330df7ec2` to `542` at
`b69f4de54c`. It remains `542` at every later measured commit through
`6a2aee317f`.

| Row | Diagnostic before `b69f4de54c` | Diagnostic after `b69f4de54c` |
| --- | --- | --- |
| `0279` | output silence: global output declared but not evaluated; hidden runtime path | `10:5: type-mismatch: Cannot assign void value to array<float> variable arr` |
| `0393` | execute: `Array index 1 is out of bounds. Array size is 1` | `4:1: type-mismatch: Cannot assign array<float> value to float variable 'y'` |
| `0468` | output silence: conditional/data-gated output not triggered | `31:32: type-mismatch: str.split source must be a string, got array<string>` |

These are the three rows that newly fail semantic checking at the culprit
commit. The new diagnostics are explicit and earlier than the old runtime or
output probes; they are still compatibility work items, but they are not an
unattributed measurement artifact.

## Funnel By Commit

| Archived commit | Semantic | Execute | Output |
| --- | ---: | ---: | ---: |
| `d330df7ec23b57008b0134865ae1071a2b151829` | 545 | 530 | 512 |
| `b69f4de54c` | 542 | 529 | 513 |
| `8e5c5064a1` | 542 | 529 | 513 |
| `2b33125519` | 542 | 528 | 512 |
| `021837ce79` | 542 | 528 | 512 |
| `408027f84b` | 542 | 528 | 512 |
| `6a2aee317f132c02e2123003b3fabee3521499b5` | 542 | 528 | 512 |

The two net execute losses from the first to last pinned state are explained
by the semantic transitions above plus later stage transitions in the full
row diff. `b69f4de54c` also moves `0571` from an execute error to output, so
its net execute change is not a pure three-row loss.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit b69f4de54c \
  --input /tmp/pine-corpus-v4-rerun-no-timeout \
  --output /tmp/pine-corpus-v4-rerun/report-20260905-pinned-b69f4de54c.json
```

The comparison used the same command for each commit in this sequence:
`b69f4de54c`, `8e5c5064a1`, `2b33125519`, `021837ce79`, and `408027f84b`,
with `d330df7ec2` as the pinned baseline and `6a2aee317f` as the endpoint.
