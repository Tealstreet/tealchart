# Pine Coverage JSON Delta Audit V1

Date: 2026-09-12

Scope: adjacent files
`pine-value-vectors-coverage-v168.json` and
`pine-value-vectors-coverage-v169.json`.

No files were deleted, moved, compacted, or regenerated for this audit.

## Headline

This is a format-duplication problem more than a retention-history problem.

Between v168 and v169:

- v168: `7,578,288` bytes, `931` cases.
- v169: `7,594,560` bytes, `934` cases.
- Existing cases changed: `0/931`.
- Added cases: `3`.
- Removed cases: `0`.
- Zero-context unified diff touched about `16,542` bytes
  (`16,407` added, `135` deleted), or `0.218%` of the v169 file.

The three added cases are the barstate boundary oracles:

- `runtime.barstate-lastconfirmedhistory-closed-market`
- `runtime.barstate-lastconfirmedhistory-realtime-last-only`
- `runtime.barstate-lastconfirmedhistory-realtime-segment`

All 931 cases shared by v168 and v169 are byte-identical when compared as
canonical per-case JSON.

## What Is In The File

Top-level v169 shape:

- `schemaVersion`
- `oracle`
- `bars`
- `tolerance`
- `cases`
- `summary`

The `cases` array is the file:

| Top-level field | Pretty JSON size | Share of v169 file |
| --- | ---: | ---: |
| `cases` | `6,906,657` bytes | `90.94%` |
| `bars` | `1,440` bytes | `0.02%` |
| `summary` | `1,406` bytes | `0.02%` |

The file is also heavily inflated by pretty JSON formatting:

| Form | Bytes | Share of v169 raw |
| --- | ---: | ---: |
| Pretty committed JSON | `7,594,560` | `100.00%` |
| Minified JSON | `3,832,245` | `50.46%` |
| Pretty-formatting overhead | `3,762,315` | `49.54%` |

Gzip confirms the content is repetitive structured text:

| File | Raw | gzip level 6 | gzip level 9 |
| --- | ---: | ---: | ---: |
| v168 | `7,578,288` | `464,030` | `435,209` |
| v169 | `7,594,560` | `464,631` | `435,768` |

## Largest Semantic Contributors

Summing minified per-case field payloads in v169:

| Group | Bytes | Share of raw v169 file |
| --- | ---: | ---: |
| Visual payloads (`compiledPlots`, `publicPathPlots`, drawings, alerts, logs) | `1,572,578` | `20.71%` |
| Actual series/output arrays (`compiled`, `publicPath`, compiled/public outputs) | `930,060` | `12.25%` |
| Expected series/output arrays | `491,783` | `6.48%` |
| Metadata (`id`, namespace, members, bars, rule, match booleans) | `589,769` | `7.77%` |
| Mismatch diagnostics and details | `224,746` | `2.96%` |

Largest individual fields:

| Field | Bytes | Share of raw v169 file |
| --- | ---: | ---: |
| `publicPathPlots` | `665,640` | `8.76%` |
| `compiledPlots` | `663,772` | `8.74%` |
| `rule` | `405,950` | `5.35%` |
| `expectedOutputs` | `296,091` | `3.90%` |
| `publicPathOutputs` | `283,606` | `3.73%` |
| `compiledOutputs` | `281,738` | `3.71%` |

So the largest semantic payloads are duplicated actual/public path visual and
series outputs, plus expected values and rule text. The largest raw contributor
overall is still pretty-print overhead.

## Changed Fraction

Case-level comparison:

| Category | Cases | Pretty payload bytes in v169 | Share of v169 file |
| --- | ---: | ---: | ---: |
| Existing identical cases | `931` | `6,207,234` | `81.73%` |
| Existing changed cases | `0` | `0` | `0.00%` |
| Added cases | `3` | `12,933` | `0.17%` |

This means the committed v169 file repeats more than six megabytes of
unchanged per-case evidence from v168 to add three new cases and update the
summary.

## Implication

For this adjacent generation, the history worth preserving is the delta:
three added barstate oracle cases and the summary/index movement. Retaining the
entire v169 full snapshot is useful as a current machine-readable artifact, but
retaining every adjacent generation as a full pretty JSON snapshot is not
required to preserve the finding.

This pushes the preferred future shape toward:

- latest full JSON for the authoritative current machine-readable state;
- compact per-generation delta artifacts for historical movement;
- optional compressed full artifacts only for named milestones or external
  archival storage.

It does not justify deleting existing history by itself. It says future growth
can be stopped at the generator/output-shape level without deciding which old
measurements to prune.

## Follow-Up

New `pine-value-vectors-coverage-v*.json` generations now write compact JSON
rather than pretty JSON. This changes no report semantics and leaves the
already committed history untouched, but removes the measured `49.54%`
pretty-formatting overhead from future full coverage generations.

Compression remains a larger possible storage win: v169 compresses from
`7,594,560` bytes to `435,768` bytes at gzip level 9, a `17.43x` reduction.
That option should stay separate from this generator fix because compressed
report artifacts are opaque to normal git diffs and to grepping the reports
directory, which is a real workflow cost now that the future growth has stopped
compounding.

## Compact-Format Consumer Sweep

The compact-output change was checked against the known executable consumers on
2026-09-12. The sweep found no script or test that reads
`pine-value-vectors-coverage-v*.json` using raw line counts, byte counts, or
regexes. The downstream value-vector reports named in this audit path import
`run-pine-value-vectors.ts` and recompute the report payload rather than reading
the committed coverage JSON.

The following focused checks were run against compact output or against
downstream reports generated after the compact-output change:

- `run-pine-value-vectors.ts /tmp/pine-value-vectors-compact-check.json`:
  parsed successfully, `934` cases, `3,832,246` bytes.
- Existing `pine-value-vectors-coverage-v169.json`: parsed successfully,
  `934` cases, `7,594,560` bytes.
- `pine-value-vectors-index.test.ts`: passed after the route row was expanded
  to concrete filenames.
- `report-pine-value-vector-member-map.ts`: generated JSON parsed.
- `report-pine-value-vector-depth.ts`: generated JSON parsed.
- `report-pine-value-vector-assertion-quality.ts`: generated JSON parsed.
- `report-pine-value-vector-oracle-provenance.ts`: generated JSON parsed.
- `report-pine-input-domain-map.ts`: generated JSON parsed; its
  `pine-value-vectors-coverage-v117.json` reference is metadata only.
- `validate-pine-member-property-map.ts`: generated JSON parsed.
- `report-pine-member-property-validation-filter.ts`: generated JSON parsed.

One failure mode is now explicit: raw text diffing a pretty coverage generation
against an equivalent compact one is format-contaminated. Comparing committed
pretty v169 to the compact temp generation produced `1 insertion` and
`342454 deletions` at the text-diff layer, while parsed canonical per-case JSON
reported `0` changed shared cases and `0` missing cases. Future delta audits
across the format boundary must compare parsed/canonical case payloads, not raw
line diffs.
