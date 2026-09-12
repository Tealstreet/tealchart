> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# V4 Pinned Measurement V1

Corpus measurements must run from an archived commit, never from this shared
checkout. `run-pinned-external-pine-corpus.ts` exports only
`packages/tealscript` at the requested commit, supplies the installed
`node_modules` through a temporary symlink, imports the runner from that
archive, and writes the resolved full commit SHA as `measurementCommitSha`.

## Measurements

| Role | Commit SHA | Report | Raw supported | Raw parse / semantic / compile / execute / output |
| --- | --- | --- | ---: | --- |
| Before four fixes | `d330df7ec23b57008b0134865ae1071a2b151829` | `/tmp/pine-corpus-v4-rerun/report-20260905-pinned-d330df7ec2.json` | 523 | 618 / 545 / 545 / 530 / 512 |
| Current pinned head | `6a2aee317f132c02e2123003b3fabee3521499b5` | `/tmp/pine-corpus-v4-rerun/report-20260905-pinned-6a2aee317f.json` | 523 | 618 / 542 / 542 / 528 / 512 |

These are raw runner results over the same 649-row no-timeout input. The
audited v4 denominator remains 558 after restoring timeout row `0254` and
applying the committed parse, behavior, and follow-up audits. The prior
normalization correction remains authoritative: add the four committed
`supported-correct-silence` rows before quoting the audited supported count.

## Reproduction

Run from the repository checkout with the requested commit explicitly named:

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit 6a2aee317f \
  --input /tmp/pine-corpus-v4-rerun-no-timeout \
  --output /tmp/pine-corpus-v4-rerun/report-20260905-pinned-6a2aee317f.json
```

The command fails before running the corpus for malformed or unresolved commit
SHAs. No cached report or generated parser artifact is used by the archived
runner; all code comes from the pinned archive.
