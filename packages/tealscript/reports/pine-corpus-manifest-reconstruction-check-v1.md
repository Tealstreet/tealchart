# Pine Corpus Manifest Reconstruction Check V1

Generated at 2026-09-11T13:14:39.467Z. Measured at commit `6f88922ca7`.

## Headline

Committed manifests exist for v5, v6, v7, and v7 size recovery. All 2506 manifest rows have repo, path, commit SHA, and content hash fields.

Refetch sample: 160 rows (40 per corpus unless the corpus is smaller).

Matched: 160. Fetch failures: 0. Hash mismatches: 0. Attrition: 0.00%.

The committed manifests are sufficient reconstruction manifests for sampled rows: repo/path/commit/hash are present and sampled pinned raw sources still fetch with byte-identical hashes after the documented normalization.

## Corpus Summary

| Corpus | Manifest rows | Sampled | Matched | Fetch failed | Hash mismatch |
| --- | --- | --- | --- | --- | --- |
| v5 | 1000 | 40 | 40 | 0 | 0 |
| v6 | 1000 | 40 | 40 | 0 | 0 |
| v7 | 456 | 40 | 40 | 0 | 0 |
| v7-size-recovery | 50 | 40 | 40 | 0 | 0 |

## Failures

No sampled manifest rows failed to reconstruct.

## Method

- Load the committed v5, v6, v7, and v7-size-recovery manifests.
- Assert expected manifest denominators: v5 1000, v6 1000, v7 456, v7-size-recovery 50.
- Assert every row has `sourceRepoUrl`, `sourceFilePath`, `commitSha`, and `sourceSha256`.
- Deterministically sample rows by hashing repo/path/commit, then fetch `raw.githubusercontent.com/{owner}/{repo}/{commit}/{path}`.
- Apply the same TradingView copied-code normalization used by the corpus refetcher before hashing.
- Compare SHA-256 against the committed manifest hash.
