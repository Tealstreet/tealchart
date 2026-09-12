> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v48

The vector runner now records each case's actual bar count. Previously every
result incorrectly reported the default 12-bar fixture because `runCase()`
used `BARS.length`; long 256-bar vectors were therefore mislabeled in JSON
evidence. The fix is metadata-only and does not alter execution or matching.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 113 | 108 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |
| Public `executeScript` path | 113 | 108 | `ta.alma`, `ta.nvi`, `ta.pvi`, two parameterized-UDF state cases |

The corrected report records `256` bars for long MACD and related vectors and
`12` for the default fixtures. The five confirmed mismatches are unchanged.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-metadata-v1-20260905.json
```

Measured result: `108/113` compiled matches and `108/113` public-path matches.
