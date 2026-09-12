> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus Pinned Sharding v1

The pinned runner now accepts `--shard-index N --shard-count K`. Manifest
positions are assigned by `index % K`, so every source belongs to exactly one
shard and the selection is stable for a fixed manifest. Each shard report keeps
the measurement commit SHA and records its shard identity; reports can be
merged only when all rows use the same SHA.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit <sha> \
  --input /tmp/pine-corpus-v5 \
  --shard-index 0 --shard-count 10 \
  --output /tmp/pine-corpus-v5-<sha>-shard-0.json
```

Run indices `0` through `9` with the same `<sha>`, then merge the shard
reports with `pine:external-corpus:merge-pinned`. Do not compare a partial
shard report with a full-corpus report as a funnel delta.

## Current measurement status

The attempted unsharded run at `006f68be81` was stopped after approximately 58
minutes without producing a report because synchronous execution monopolized
the process on a pathological source. No funnel result was recorded from that
run. Sharding is now available for a reproducible rerun; a per-row process
timeout remains a separate tooling improvement.
