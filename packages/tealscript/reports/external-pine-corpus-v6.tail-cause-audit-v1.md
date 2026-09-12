> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v6 Tail Cause Audit v1

Date: 2026-09-11
Auditor: codex-jlxeb6

This note audits raw v6 corpus failure causes below the current-gap causes
covered by `external-pine-corpus-v6.remaining-cause-audit-v1.md`. These are raw
pipeline causes from the daily/context-stress reports, not additional
`validity.bucket=tealscript-gap` rows.

## Result

| Cause | Rows | Real gap | Not ours | Classification |
| --- | ---: | ---: | ---: | --- |
| `execute:request-context-limit` | 6 | 0 | 6 | Pine runtime limit / supported row classification. |
| `semantic:duplicate-argument` | 4 | 0 | 4 | Invalid Pine by declared version. |
| `output:source-declares-no-chart-output` | 4 | 0 | 4 | Correct silence / no chart-output source. |
| `semantic:implicit-numeric-bool` | 2 | 0 | 2 | Invalid Pine v6. |
| `output:synthetic-window-did-not-trigger-output` | 1 | 0 | 1 | Corpus synthetic-window artifact; extended probe finds output. |

## Cause Notes

### `execute:request-context-limit` (6)

Rows: `0098`, `0228`, `0345`, `0480`, `0482`, `0499`.

All six rows are already classified as `validity.bucket=supported`; they reached
visible output despite compiled bar errors. The observed runtime error is:

```text
Too many unique request.* contexts: maximum is 40
```

TradingView documents the same class of limit: scripts can use up to 40 unique
`request.*()` calls for ordinary plans, and the limit applies to
`request.security()`, `request.security_lower_tf()`, and other `request.*`
functions. Classification: Pine runtime resource limit / supported row, not a
TealScript engine gap.

### `semantic:duplicate-argument` (4)

Rows: `0368`, `0384`, `0451`, `0566`.

All four are declared v5 and already classified `invalid-pine`. The sources pass
the same parameter twice:

- `plotshape(..., size=..., size=...)`
- `fill(..., transp=..., transp=...)`
- `label.new(..., size=..., size=...)`

Function calls cannot supply more than one argument for the same parameter.
Classification: invalid Pine by declared version.

### `output:source-declares-no-chart-output` (4)

Rows: `0342`, `0409`, `0987`, `0997`.

All four are already classified `supported`. The source declares no plot,
drawing, alert, or strategy order calls, so empty chart output is expected.
Classification: correct silence / corpus accounting artifact.

### `semantic:implicit-numeric-bool` (2)

Rows: `0077`, `0938`.

Both are declared v6 and already classified `invalid-pine`. Pine v6 removed
implicit `int`/`float` to `bool` casts; numeric values must be explicitly
wrapped with `bool(...)` when used as conditions. Classification: invalid Pine
by declared version.

### `output:synthetic-window-did-not-trigger-output` (1)

Row: `0543`.

The daily 160-bar synthetic window did not trigger visible output, but the
extended probe produced drawing/alert output. The row is already classified
`supported`. Classification: synthetic-window artifact, not an engine gap.

## References

- TradingView limitations docs:
  `https://www.tradingview.com/pine-script-docs/writing/limitations/`
- TradingView v6 migration guide:
  `https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/`
