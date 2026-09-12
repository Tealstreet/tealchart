> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 ZigZag Fix Check V1

This is a pinned, single-row attribution check for `sources/0771__msongkiet-TDV_share__ZigZag_EMA.pine`, whose source provenance remains the v5 manifest:

- Repository: `https://github.com/msongkiet/TDV_share`
- Source path: `ZigZag_EMA.pine`
- Source commit: `1850e5adb5ca3fefc83eb036595ba24fa716feaf`

The corpus source was not re-harvested. Each run exported `packages/tealscript`
from the stated commit with the pinned runner and used the same fixed source
directory and `--only-script` selector.

| Engine archive | First failure | Execution mode | Outcome | Diagnostic |
| --- | --- | --- | --- | --- |
| `1bd0cf4926b508a143fa3b57f585b191215b17a7` | semantic | not-run | failed | `4:1: unresolved-import: Official TradingView library 'TradingView/ZigZag' version 6 is not implemented by TealScript` |
| `96665bfd76` | none | compiled | produced-output-compiled | none |

The row therefore moves from `tealscript-gap` to `supported` in the pinned
runner. This is a targeted attribution check, not a new full-corpus headline;
the committed v5 full measurement remains the report at
`measurementCommitSha=1bd0cf4926b508a143fa3b57f585b191215b17a7`.

Reproduction:

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit 1bd0cf4926 \
  --input /tmp/pine-corpus-v5 \
  --output /tmp/pine-corpus-v5/zigzag-1bd0cf4926.json \
  --only-script sources/0771__msongkiet-TDV_share__ZigZag_EMA.pine

yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit 96665bfd76 \
  --input /tmp/pine-corpus-v5 \
  --output /tmp/pine-corpus-v5/zigzag-96665bfd76.json \
  --only-script sources/0771__msongkiet-TDV_share__ZigZag_EMA.pine
```
