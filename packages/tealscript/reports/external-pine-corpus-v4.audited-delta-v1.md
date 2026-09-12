> Superseded by external-pine-corpus-v4.audited-delta-v4.md. Historical measurement only; use the superseding report for current figures.

# V4 Audited Delta V1: Comparable Registry Rerun

This is the comparable headline for the registry-enabled rerun. It applies the same committed parse audit, behavior audit, and follow-up argument audit used to produce the earlier normalized result. No source was re-harvested; the fixed v4 corpus remains 650 pinned rows.

## One Comparable Headline

The common audited eligible universe is **558 rows**: 650 total minus 61 invalid-Pine rows, 20 unsupported-by-design rows, and 11 corpus-hygiene rows. The original published baseline used an earlier 565-row eligible universe; seven rows were subsequently identified by the committed audits as invalid or unsupported. To avoid mixing denominators, the baseline below is recomputed on the same 558-row universe.

| Measure | Audited baseline on common universe | Registry-enabled rerun on common universe | Delta |
| --- | ---: | ---: | ---: |
| Supported | 512 | 518 | +6 |
| TealScript gap | 46 | 40 | -6 |
| Achievable denominator | 558 | 558 | 0 |
| Parity | `512 / 558` (91.76%) | `518 / 558` (92.83%) | +1.08 pp |

The corresponding full audited bucket counts are:

| Bucket | Common-denominator baseline | Registry-enabled rerun |
| --- | ---: | ---: |
| Supported | 512 | 518 |
| TealScript gap | 46 | 40 |
| Invalid Pine | 61 | 61 |
| Unsupported by design | 20 | 20 |
| Corpus hygiene | 11 | 11 |
| Total | 650 | 650 |

The previously published baseline headline `512 supported / 53 gap / 55 invalid / 19 unsupported / 11 hygiene` remains historically correct for its original audit snapshot, but it is not the comparable denominator. The comparable baseline above applies the later audit reclassifications before measuring the engine delta.

## Timeout Disposition

Row `sources/0254__davidadff7-blip-CODE23__Aoi_alert_all.pine` is included in the 650-row audit universe and in the 40-row after gap count. Its parser probe succeeds (`Program.body.length === 692`); full execution exhausts the isolated 45-second classifier timeout. The registry-enabled rerun uses the 649-row no-timeout input only to prevent one row from blocking the run, then restores this row's audited execute-gap disposition. It is not silently dropped and does not change the denominator.

## Registry-Enabled Measurement

Command:

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus \
  --input /tmp/pine-corpus-v4-rerun-no-timeout \
  --output /tmp/pine-corpus-v4-rerun/report-20260905-with-registry.json
```

Raw output for the 649 completed rows was `supported=514`, `tealscript-gap=96`, `invalid-pine=19`, `unsupported-by-design=20`; its funnel was parse `618`, semantic `537`, compile `537`, execute `522`, output `503`. Those raw buckets are not the parity headline. Applying the committed audits and restoring the timeout disposition yields the comparable audited result above.

The audited before/after engine rows are `A=4` newly passing rows, `B=8` rows with a distinct later diagnostic, and `C=4` rows with identical diagnostics. The two additional supported rows versus the prior normalized rerun are the one-argument `ta.min` and `ta.max` fixes present in `fd1f18eab5`; the explicit registry wiring is now part of the measurement path, while official-library resolution is also implemented internally by the source registry.
