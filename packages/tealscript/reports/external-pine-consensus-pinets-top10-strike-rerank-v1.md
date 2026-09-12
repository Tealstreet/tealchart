# External Pine Consensus PineTS Top-Ten Strike Rerank v1

Measured at `31a4d4eb61`.

Companion data:
`external-pine-consensus-pinets-top10-strike-rerank-v1.json`.

## Purpose

`external-pine-consensus-survivor-triage-v1.md` left `67` sole-voter value
candidates after the first PineTS documented-family strike: `65` `pinets-sole`
and `2` `pine-a-script-sole`.

codex-jk7l2w's top-ten PineTS family probe at `abbeda9f9d` changes that
ranking. It tested the highest-row-count unprobed PineTS families against
existing documented or hand-derived value-vector oracles. PineTS failed the
named probes for `member:plot`, `member:na`, and `member:nz`; those families
strike `805` PineTS-sole rows in the full run.

This report applies that strike to the already-filtered `67` survivor rows.

## Inputs

- Survivor triage:
  `reports/external-pine-consensus-survivor-triage-v1.json`, measured at
  `77182ce65e036932bda7c1699468e69983a6ad37`, sha256
  `a307b650c9985b8f806008ecf980d419d3b7b2cc322db472cee9704577c5948e`.
- PineTS top-ten family probe:
  `reports/external-pine-consensus-pinets-top10-family-probe-v1.json`, from
  codex-jk7l2w commit `abbeda9f9d`, sha256
  `d8576dc748cfbda5e843b14c8ba1aaa7598347ba260761a312ef6bee896a88cc`.

## Strike Rule

Strike a row when both are true:

- the row's provenance is `pinets-sole`;
- the row touches `member:plot`, `member:na`, or `member:nz`.

Reason: documented or hand-derived value vectors outrank a sole external
implementation. PineTS failed the named probes for these families, so PineTS
disagreement in rows touching them is evidence about PineTS, not TealScript.

## Headline

| Bucket | Rows |
| --- | ---: |
| Survivors before this strike | 67 |
| PineTS-sole survivors before this strike | 65 |
| Pine-A-Script-sole survivors before this strike | 2 |
| Struck by top-ten documented-family probe | 65 |
| Surviving after this strike | 2 |
| Two-voter external-consensus survivors | 0 |
| Newly allowlisted PineTS-sole rows | 0 |

All `65` PineTS-sole survivors are struck. Every one touches `member:plot`;
`40` also touch `member:na`, and `21` also touch `member:nz`.

The positive trust map found `0` fully allowlisted PineTS-sole rows. The top-ten
probe then proved `plot`, `na`, and `nz` wrong against documented vectors and
struck the remaining PineTS-sole candidate list. There is no PineTS-sole value
candidate left to adopt from this run.

## Reranked Survivors

Only two rows remain, both uncorroborated Pine-A-Script-sole warmup rows:

| Rank | Cause | Rows | Provenance | Rows |
| ---: | --- | ---: | --- | --- |
| 1 | `warmup-na-vs-finite` | 2 | `pine-a-script-sole` | `v7 0225`, `v7 0319` |

| Row | First difference | Note |
| --- | --- | --- |
| `v7 0225` | `plot[0][0] 0 != null` | Pine-A-Script-sole warmup evidence; not corroborated. |
| `v7 0319` | `plot[0][0] null != 100000` | Pine-A-Script-sole warmup evidence; not corroborated. |

## Interpretation

The automatic value candidate list now has no strong external-consensus
survivors, no PineTS-sole survivors, and only two weak sole-voter warmup rows
from Pine-A-Script. Do not fix from this candidate list without a separate
oracle. Candidate adoption now requires two-voter consensus,
documentation/hand-derived vectors, TradingView trace, or a later positive trust
probe that proves the relevant family.
