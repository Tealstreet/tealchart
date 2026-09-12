> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Rerun de08b99574 V1

Fixed corpus path:
`packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910`.

Measurement commit: `de08b9957438c00cb8ed1d7fa162fca9059ad6e5`.

Command:

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit de08b99574 \
  --input /Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910 \
  --exclude-script sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine \
  --output /Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/runs-de08b99574/report-de08b99574-minus-0930.json

yarn workspace @tealstreet/tealscript pine:external-corpus:merge-pinned \
  --input /Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/runs-de08b99574/report-de08b99574-minus-0930.json \
  --timeout-row sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine \
  --output /Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/runs-de08b99574/report-de08b99574-final.json
```

## Headline

- Total rows: 1000.
- Validity buckets: 843 supported, 82 TealScript gaps, 57 invalid Pine, 8
  corpus hygiene, 10 unsupported by design.
- Achievable denominator: 925.
- Achievable output support: 836/925 = 90.38%.
- Supported-row headline: 843/925 = 91.14%.

## Delta From Prior 844/925 Report

Prior report:
`packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/current-dispatch/report-cc4423655d-merged.json`.

- Supported rows moved from 844 to 843.
- TealScript gaps moved from 81 to 82.
- The only row-level movement is
  `sources/0467__everget-tradingview-pinescript-indicators__roi_return_on_investment.pine`.
- `0467` moved from visible output to
  `output-silence:global-output-declared-but-not-evaluated`.

## Single-Row Causes

The v2 dispatch list at `1bd0cf4926` had 27 causes, 15 of them single-row.
The later v3 dispatch list at `cc4423655d` had drifted to 22 causes, 11 of
them single-row.
