# Pine Report Volume Audit V1

Date: 2026-09-12

Scope: `packages/tealscript/reports` at `067d99f1ed`.

No files were deleted, moved, or compacted for this audit.

## Headline

The reports directory is large enough to break tools:
`run-pinned-external-pine-corpus.ts` failed with `spawnSync git ENOBUFS` when it
tried to archive `packages/tealscript` with a 128MB buffer. The immediate fix
was to raise the archive buffer, but the cause is report volume.

Recursive report directory size:

| Metric | Figure |
| --- | ---: |
| Files | `734` |
| JSON files | `295` |
| Markdown files | `435` |
| Pine files | `4` |
| Apparent size | `621.24 MiB` |
| Disk blocks | `622.70 MiB` |
| `du -sh` | `623M` |

This is not broad report bloat. It is a skewed distribution dominated by full
value-vector coverage JSON generations.

## Size Distribution

| Bucket | Files | Apparent size |
| --- | ---: | ---: |
| `<10KB` | `340` | `1.06 MiB` |
| `10-100KB` | `162` | `5.62 MiB` |
| `100KB-1MB` | `98` | `29.63 MiB` |
| `1-5MB` | `66` | `152.10 MiB` |
| `>5MB` | `68` | `432.83 MiB` |

Quantiles by file size:

| Quantile | Size |
| --- | ---: |
| p50 | `0.01 MiB` |
| p75 | `0.22 MiB` |
| p90 | `4.70 MiB` |
| p95 | `6.51 MiB` |
| p99 | `6.94 MiB` |

By extension:

| Extension | Files | Apparent size |
| --- | ---: | ---: |
| `.json` | `295` | `575.15 MiB` |
| `.md` | `435` | `46.09 MiB` |
| `.pine` | `4` | `0.01 MiB` |

## Largest Family

`pine-value-vectors-coverage-v90.json` through
`pine-value-vectors-coverage-v169.json` are the dominant family.

| Family | Files | Apparent size |
| --- | ---: | ---: |
| Value-vector coverage JSON generations | `80` | `486.44 MiB` |
| External corpus JSON reports | `68` | `57.65 MiB` |
| Value-vector coverage Markdown generations | `88` | `40.00 MiB` |
| Value-vector maps/depth/provenance JSON | `92` | `16.59 MiB` |
| Other | `367` | `12.21 MiB` |
| Property-map JSON | `25` | `1.98 MiB` |
| Rule 6 Markdown | `8` | `0.05 MiB` |
| Trace JSON | `2` | `0.03 MiB` |

Coverage JSON growth:

| Range | Generations | Total | Average | First | Last |
| --- | ---: | ---: | ---: | ---: | ---: |
| v90-v119 | `30` | `152.94 MiB` | `5.10 MiB` | `4.37 MiB` | `5.92 MiB` |
| v120-v149 | `30` | `194.04 MiB` | `6.47 MiB` | `5.95 MiB` | `6.77 MiB` |
| v150-v169 | `20` | `139.46 MiB` | `6.97 MiB` | `6.80 MiB` | `7.24 MiB` |

Current growth rate for this family is about one full snapshot per generated
revision:

- Average over v90-v169: `6.08 MiB` per generation.
- Average over latest 10: `7.10 MiB` per generation.
- Latest generation v169: `7.24 MiB`.

At the latest-10 average, another 50 full coverage generations would add about
`355 MiB` to the working tree; another 100 would add about `710 MiB`.

Git history shows the coverage JSON family was added rapidly, mostly one full
snapshot per commit across 2026-09-11 and 2026-09-12. The content is useful as a
sequence of measurements, but the committed shape is full snapshots rather than
a compact history.

## Compression Check

The JSON is highly compressible:

| Input | Raw | Gzip result | Ratio |
| --- | ---: | ---: | ---: |
| Coverage JSON v90-v169 | `486.44 MiB` | `29.71 MiB` at gzip level 9 | `0.061` |
| All report JSON | `575.15 MiB` | `38.50 MiB` at gzip level 6 | `0.067` |

This means the bulk is repetitive structured JSON, not inherently large binary
data. Compacting or normalizing would buy large working-tree and archive wins.

## Retention Options

No option should erase the fact that generation-to-generation movement is
sometimes the finding. The question is how to preserve that history without
committing every intermediate full snapshot as a large working-tree file.

### Option A: Prune Superseded Middle Full Snapshots

Keep the latest full JSON, named milestone JSONs, the Markdown summaries, and
the authoritative index. Delete middle full JSON generations that are superseded
as actionable measurements.

Cost:

- Reduces HEAD working-tree/archive size, but does not shrink existing Git
  history without a separate history-rewrite or archival decision.
- Makes local checkout of an arbitrary middle generation harder unless it is
  recovered from Git history before pruning.
- Needs a written retention rule so "middle" does not mean "whatever feels old."

Benefit:

- Smallest code change.
- Keeps human-readable reports and current authoritative routes intact.
- Prevents future pinned-corpus archive failures caused by HEAD size.

### Option B: Commit Compressed JSON Artifacts

Store large JSON reports as `.json.gz` and teach readers/generators to load
plain JSON or gzip transparently.

Cost:

- Git diffs become opaque for those files.
- Review moves to generated Markdown summaries, JSON schema checks, and helper
  commands.
- Existing tools must learn decompression before this is safe.

Benefit:

- Measured compression would reduce all report JSON from `575.15 MiB` to about
  `38.50 MiB`.
- Preserves every full snapshot and every generation boundary.
- Avoids deciding which historical generations matter.

### Option C: Stop Emitting Full JSON Per Run

Keep one latest full machine-readable artifact per report family, plus a small
per-generation delta artifact:

- previous report id/hash;
- new report id/hash;
- changed rows/cases;
- headline figures;
- supersession metadata.

Cost:

- Requires generator work and a stable delta schema.
- Reconstructing a past full report requires the retained base plus deltas, or
  rerunning the old commit.
- Consumers that expect `pine-value-vectors-coverage-vNNN.json` would need a
  migration path.

Benefit:

- Preserves the part that has repeatedly mattered: the delta between
  generations.
- Stops the `~7 MiB` per-generation working-tree growth.
- Keeps reviewable historical movement without retaining every unchanged case
  body 80 times.

### Option D: Move Bulk Machine Artifacts Out Of Git

Keep Markdown summaries, index routes, hashes, and reconstruction manifests in
Git. Publish large JSON artifacts to external storage such as release assets,
object storage, or an artifact registry.

Cost:

- Adds availability and access-control questions.
- Local clone no longer contains every machine artifact by default.
- CI/replay scripts need a fetch/cache step and must fail loudly when artifacts
  are unavailable.
- Git LFS is a variant of this option, not magic: it still adds hosting and
  pointer-management rules.

Benefit:

- Keeps Git focused on source, summaries, manifests, and current routes.
- Allows retaining all full snapshots without making every checkout carry them.
- Can support immutable artifact hashes for reproducibility.

### Option E: Normalize Coverage Data

Split value-vector coverage into stable case/member metadata plus a compact run
result table. Repeated case definitions would live once; each generation would
record only status, expected-red set, coverage counts, and changed case ids.

Cost:

- Highest implementation complexity.
- Requires careful schema design and migration of existing consumers.
- Bad normalization could hide the full evidence behind too many joins.

Benefit:

- Attacks the actual duplication instead of only compressing it.
- Preserves machine-readability and meaningful diffs.
- Likely gives the best long-term shape if value-vector generation continues at
  tonight's rate.

## Recommended Decision Shape

This is a Sam-level repo-health decision, not something to fix opportunistically
inside a parity lane.

A conservative path would be:

1. Freeze deletion for now.
2. Stop adding new full middle snapshots by switching the generator to latest
   full plus delta artifacts.
3. Decide separately whether old full JSON snapshots should be compressed,
   pruned from HEAD, or moved to external artifact storage.
4. Keep Markdown reports and authoritative indexes in Git either way, because
   they are the human route into the measurements.

The important boundary: deleting or hiding all history is wrong, because deltas
have repeatedly been the finding. Keeping every generation as a full working
tree JSON is also now proven costly, because it already broke the pinned corpus
runner with an unhelpful buffer error.

Follow-up `pine-coverage-json-delta-audit-v1.md` checks adjacent generations
v168 and v169. It found `0/931` existing cases changed, `3` cases added, and a
zero-context diff touching only about `0.218%` of the v169 file. That points to
future generator/output shape, not just historical retention, as the highest
leverage fix.
