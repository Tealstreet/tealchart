> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus Daily Rerun at a75ebd88d7

Date: 2026-09-11

## Basis

- Measurement commit: `a75ebd88d7e060fbdb5ad8d773f4eef15778cf92`.
- V6 pinned corpus: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911`.
- V6 daily report: `external-pine-corpus-v6.daily-rerun-a75ebd88d7.json`.
- V5 pinned corpus: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910`.
- V5 daily report: `external-pine-corpus-v5.daily-rerun-a75ebd88d7.json`.
- Method: single daily-standard corpus runner at current HEAD, pinned source manifests and source SHA-256 hashes preserved in each corpus manifest.

## Headline

| Corpus | Previous figure | Previous commit | New figure | New commit | Movement |
| --- | ---: | --- | ---: | --- | ---: |
| V6 daily achievable output | `781/934` (`83.62%`) | `060d8c2ad1` | `796/930` (`85.59%`) | `a75ebd88d7` | `+15` output rows, `+1.97pp` |
| V6 daily raw output | `781/1000` (`78.10%`) | `060d8c2ad1` | `796/1000` (`79.60%`) | `a75ebd88d7` | `+15` output rows |
| V5 daily achievable output | `863/923` (`93.50%`) | `34259f21e0` | `872/923` (`94.47%`) | `a75ebd88d7` | `+9` output rows, `+0.97pp` |
| V5 daily raw output | `863/1000` (`86.30%`) | `34259f21e0` | `872/1000` (`87.20%`) | `a75ebd88d7` | `+9` output rows |

The v6 parser fix cascade is real but not one-for-one with the 24 rows that now
parse: daily output improves by 15 rows. The TealScript-gap pool moves from
`140` to `121`, so 19 rows leave that bucket; four of those do not become
daily output because the achievable denominator/classification also changed
from `934` to `930`.

## Current V6 Daily

- Funnel: parse `988/1000`, semantic `863/1000`, compile `863/1000`, execute `844/1000`, output `796/1000`.
- Achievable output: `796/930` (`85.59%`).
- Validity: `{"invalid-pine":28,"supported":809,"tealscript-gap":121,"unsupported-by-design":42}`.
- TealScript-gap pool: `121`.

## Current V5 Daily

- Funnel: parse `989/1000`, semantic `893/1000`, compile `893/1000`, execute `886/1000`, output `872/1000`.
- Achievable output: `872/923` (`94.47%`).
- Validity: `{"corpus-hygiene":8,"invalid-pine":59,"supported":876,"tealscript-gap":47,"unsupported-by-design":10}`.
- TealScript-gap pool: `47`.

## Conclusion

The stale denominator moved in our favor for both corpora. V6 daily gains 15
output rows at current HEAD, while v5 daily gains 9. The v6 parse repair does
not fully cascade into output, but it materially improves the achievable daily
headline and shrinks the v6 TealScript-gap pool.
