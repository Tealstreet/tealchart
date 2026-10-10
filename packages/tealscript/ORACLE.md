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

Old monorepo and mirror Git history still contains prior captures. This cutover prevents new capture growth and removes archive bytes from fresh application trees; it does not rewrite history. Development clones should use `--filter=blob:none` without `--depth`, retaining the commit graph while fetching historical file contents on demand. Historical checkouts, diffs and file reads may need network access. Existing full clones retain their downloaded packs; changing the filter does not reclaim them. Vendored source snapshots can keep `--depth=1` with `--filter=blob:none`. Retain Docker/EAS/mirror archive exclusions.
