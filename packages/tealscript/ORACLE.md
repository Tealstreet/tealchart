# Native oracle fixtures

Capture requests, raw exports, screenshots, refusal diagnostics and inter-agent responses live in the public [TealScript oracle repository](https://github.com/Tealstreet/tealscript-oracle). Add new rounds there on `master`; application capture commits are refused by the fixture guard. Historical `packages/tealscript/oracle-probes/` prefixes map to the archive root.

`oracle-fixtures.json` pins a reviewed archive commit and the exact files consumed by application tests, with SHA-256 and byte length. `oracle-probes/` is an ignored local sparse checkout for those files. It preserves existing native input bytes and test assertions; there is no engine-generated expected-value replacement. No archive fetch runs during application install or build.

From this package, prepare the fixtures explicitly before running tests:

```sh
yarn oracle:fetch
yarn oracle:verify
yarn vitest run tests/compat/pine-native-ohlc-export-v1.test.ts
```

The first fetch needs Git and network access to the public repository. Later tests work offline with the verified checkout. Missing fixtures or a changed pin raise a setup error rather than excluding tests. Both application and mirror CI fetch and verify fixtures before testing. The setup refuses to replace unmanaged directories, modified files, or a checkout with new commits; move capture work to the oracle repository instead.

To promote new evidence, commit it in the oracle repository, review its source/settings/observation provenance, and update this package's lock with the immutable commit and selected file hashes. Add the corresponding assertions in the same application change. Include dynamic-path dependencies and opt-in semantic sweeps. Run `yarn oracle:fetch`, `yarn oracle:verify`, and the affected test files. Screenshots and unused full exports stay in the archive.

A passing regression checks only the behavior asserted by that test and the captured settings. Compile success, exported values, rendered visuals and live-bar behavior are separate evidence. Refusals remain observations; unavailable captures remain held. Preserve original CSV headers, missing cells and numeric strings, source hashes and diagnostics. Do not infer native expected values from TealScript output.

The v95 item-20 finite observers pin five same-key samples per version, including the actual closing evaluation. Replay one harness execution per sample to lock ordinary rollback and scalar/UDT-field varip retention; native absolute counters do not supply intervening ticks. Only the first export's 32 baseline rows per version receive CLOSED credit. The first exported row lacks its predecessor, so its two delta and two previous-plus-one engine comparisons remain held. Live/close samples and repeated history receive zero additional CLOSED credit. Reset-to-one on the missed first live event, total native updates, execution identity and UI/CSV frame alignment remain unobserved.

The v91 cumulative regression compares each v5/v6 full export's 23,085 common closed rows exactly from its separate 23,086-row physical prefix. Index0 metadata belongs to the independent frontier companion; the unchanged original's own execution frontier is unobserved, so historical holds 7/8 remain held. The v5 viewport starting at companion index21493 remains context-unmet on its own. Its present values and both full exports' developing rows are pinned as observed exclusions with zero parity credit. No sessions are spliced, accumulator seeds supplied, or updates synthesized.

Old monorepo and mirror Git history still contains prior captures. This cutover prevents new capture growth and removes archive bytes from fresh application trees; it does not rewrite history. Development clones should use `--filter=blob:none` without `--depth`, retaining the commit graph while fetching historical file contents on demand. Historical checkouts, diffs and file reads may need network access. Existing full clones retain their downloaded packs; changing the filter does not reclaim them. Vendored source snapshots can keep `--depth=1` with `--filter=blob:none`. Retain Docker/EAS/mirror archive exclusions.

## V5 color controls v1

The [v96 native response](https://github.com/Tealstreet/tealscript-oracle/blob/962bbf90b269e98f26af84d86f7cb83972c11f44/v96/captures/v96/RESPONSE-v96-v1.md) records two open v5 controls: `color.rgb(33, 66, 99, 12.5) == #214263DF` and `na(color(na))` both export false, while the engine returns true. The corresponding v6 controls export true and match the engine. Each predicate is witnessed on all 32 selected closed rows; neither receives parity credit from the passing gradient tests.

The v5 constructor's exported transparency is 13, but its other literal equalities and actual color value are absent. The missing cast has only its NA predicate exported. These observations establish the divergences without selecting a color storage or cast representation; keep both fixes held until discriminating native evidence supports an implementation, and preserve the existing gradient and v6 contracts.
