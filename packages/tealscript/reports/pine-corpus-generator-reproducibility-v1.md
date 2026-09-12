# Pine Corpus Generator Reproducibility V1

Generated at 2026-09-11T13:00:47Z. Audited at `28221b0a7c` before the hardening commit.

## Headline

I audited 17 corpus report/acquisition generators that back the current quoted corpus figures.

The headline synthesis reducers are reproducible from committed inputs. The source-scanning and rerun/property generators need local pinned source caches, but those caches are reconstructable in practice from committed manifests: v5, v6, v7, and v7 size recovery all store repo, path, commit SHA, and content hash for every row.

This audit hardened the risky paths so future reruns fail on missing/mismatched denominators instead of producing a plausible number from partial data.

## Manifest Reconstruction

`pine-corpus-manifest-reconstruction-check-v1.md` verifies the pointer layer. It checked the committed manifests for all 2,506 rows and refetched a deterministic 160-row sample, 40 from each corpus.

Result: 160/160 sampled rows fetched successfully and matched SHA-256 after the documented TradingView copied-code normalization. Sampled attrition is 0.00%: no fetch failures and no hash mismatches.

That means the caches are not committed, but the committed manifests are sufficient reconstruction manifests for sampled rows. A clean checkout still needs a rebuild/refetch step before the ten cache-dependent generators can run.

## Hardening

- `report-pine-corpus-member-map.ts`: now uses this package's `.cache` by default instead of a sibling worktree, asserts exactly 1000 v5 and 1000 v6 `.pine` files, and records the current `measuredCommit`.
- `report-pine-corpus-optional-argument-usage.ts`, `report-pine-corpus-vector-depth-gap.ts`, and `report-pine-corpus-construct-depth.ts`: now use this package's `.cache` by default and assert 1000/1000/456/50 manifest rows before scanning.
- `report-pine-corpus-saturation.ts`: now asserts 456 accepted v7 rows and 50 recovered rows, and records the current `measuredCommit`.
- `report-external-pine-corpus-v7-size-recovery.ts`: now asserts 456 accepted v7 rows, 50 recovered manifest rows, and 50 recovered run rows, and records the current `measuredCommit`.
- `report-external-pine-corpus-output-asymmetry-reslice.ts`: now asserts its source report summary before reslicing: 1936 audited rows, 2142 findings, 1230 all-NaN fields, and 912 constant-finite fields.
- `report-pine-corpus-priority-queue.ts`: now asserts its three component report contracts before ranking.
- `report-pine-corpus-invalid-clusters.ts`: now asserts v5/v6 section presence and the 32/54/63 invalid-Pine row denominators.
- `report-external-pine-corpus-v7-rejection-audit.ts`: now refuses live GitHub search refetch unless `PINE_V7_REJECTION_AUDIT_REFETCH=1` is set for an intentional new measurement.

## Reproducibility Classes

| Class | Scripts | Meaning |
| --- | ---: | --- |
| Repo-clean reducer | 5 | Runs from committed reports/manifests and fails if an upstream report contract changes. |
| Local-cache dependent | 10 | Requires named `.cache/tealscript/...` source or baseline run artifacts. Missing cache should stop the run. |
| Acquisition/replay | 2 | Produces or reconstructs corpus inputs from network/cache state; not a pure rerunnable reducer. |

## Repo-Clean Reducers

These are the safest reruns:

- `report-external-pine-corpus-v6-current-gap-pool.ts`
- `report-external-pine-corpus-output-asymmetry-reslice.ts`
- `report-pine-corpus-priority-queue.ts`
- `report-pine-corpus-invalid-clusters.ts`
- `report-external-pine-corpus-current-error-rerun.ts` for v5/v6. Its v7 baseline still points at a local cached baseline report, so a fully clean v7 replay needs that cache restored.

## Cache-Dependent Generators

These depend on local pinned source caches:

- `audit-external-pine-corpus-output-properties.ts`
- `audit-external-pine-corpus-member-properties.ts`
- `report-external-pine-corpus-v7-current-gap-pool.ts`
- `report-external-pine-corpus-v7-current-rerun.ts`
- `report-external-pine-corpus-v7-size-recovery.ts`
- `report-pine-corpus-member-map.ts`
- `report-pine-corpus-saturation.ts`
- `report-pine-corpus-optional-argument-usage.ts`
- `report-pine-corpus-vector-depth-gap.ts`
- `report-pine-corpus-construct-depth.ts`

The cache dependency is not a defect in the measured figures; it is a boundary. The committed manifests identify pinned repos/paths/SHAs and content hashes for every row, and sampled refetch currently succeeds. The downloaded source trees and some cached baseline run reports are not committed, so a clean checkout without a rebuild/refetch step cannot run these measurements immediately.

In this worktree right now, v7 and v7-size-recovery caches are present, while v5/v6 source caches are absent. The hardened v5/v6 source scanners now correctly refuse until `.cache/tealscript/pine-corpus-v5-20260910` and `.cache/tealscript/pine-corpus-v6-20260911` are restored locally or intentionally supplied with `PINE_CORPUS_V5`/`PINE_CORPUS_V6`.

## Acquisition And Replay

- `report-external-pine-corpus-v7-rejection-audit.ts` replays the v7 candidate search. It now uses cached GitHub search pages by default and refuses live refetch unless `PINE_V7_REJECTION_AUDIT_REFETCH=1`.
- `recover-external-pine-corpus-v7-size-rejections.ts` fetches the 50 recovered sources and builds the recovery cache/manifest. It is an acquisition script, not a pure measurement reducer.

## Bottom Line

Rule 3 holds for the committed-input reducers after this audit. For cache-dependent generators, Rule 3 needs one more condition: the named local cache must be present and complete, either preserved locally or rebuilt from the committed reconstruction manifests. Otherwise the honest rerun result is a loud failure, not a fresh number.
