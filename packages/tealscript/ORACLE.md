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

## V5 color controls v4

The [v98 partial constructor return](https://github.com/Tealstreet/tealscript-oracle/blob/329631f43d8c38a944f8c016e98131f4351f48aa/v98/captures/v98/RESPONSE-v98-v2.md) distinguishes v5 literal-argument `color.new` from series constructors. Literal NEW matches truncating transparency before byte conversion across the sixteen captured cases. Its four case13 nonmatches at T22.9 remain actual all-zero equality vectors: truncation predicts alpha199 outside the supplied194..198 palette, but equality to that predicted literal was not exported. All four original frozen NEW hypotheses remain refuted; matching the getter/equality vector does not recover hidden storage.

The engine applies integer transparency to v5 constant NEW; switch-selected RGB and series constructors retain byte rounding. The direct constant RGB12.5/DF=false and RGB50/80=true comparisons do not distinguish truncation from percent-rounding. Its internal quantizer and the direct RGB census root remain HELD. A prototype constant-comparison conversion was removed because this evidence cannot select it. The native flags remain pinned as observed contrary cells, with zero parity credit.

The [complete v98 return](https://github.com/Tealstreet/tealscript-oracle/blob/1273152e44a024bbf5b3d6830a4bbd1e7be55f63/v98/captures/v98/RESPONSE-v98-v6.md) supplies the missing v5 cast discriminator: `color(na)` has finite0/0/0/100 getters, NA0 and equality to transparent black. Var/array/history transfers retain it, and nz retains the present value. The v5 cast now produces transparent black; typed color NA retains its own missingness. The v5 NA-cast census predicate and every v96 non-index control outside the held v5 direct RGB root compare exactly.

V98 constructor v6 is consumed/UNOBSERVED after entry failure; existing v96 v6 controls remain its numeric guard. The v98 v6 cast has NA1 with finite0/0/0/100 getters and distinct self/var versus array equality. Its four frozen alternatives are all refuted. The engine remains byte-identical to the base on both complete v6 replay vectors, but1,280 new cast cells are observed contrary: blank getters and false self/var equality differ from native. Those cells are pinned with zero parity credit;2,688 other cast cells and1,888 v96 v6 controls compare exactly. This is an actual unresolved v6 divergence, not export-precision uncertainty or an unobserved state. No v6 storage model or historical hold is closed by the v5 changes.

### V99 direct v5 constructor evidence

The1273152e return binds both unchanged v5 direct-comparison probes and all8,064
primary plot cells. All five frozen comparison policies, including both prior
v96/v98 RGB candidates, are REFUTED. The observation-only regression preserves
native getter/equality/calibration values; compatible finite equality-relation
completions still disagree on an unqueried immediate RGB/NEW comparison.
Those completions are not storage algorithms. No replacement is selected or
installed, no new engine parity credit is claimed, and the v96 RGB root remains
HELD. Existing v5/v6 engine behavior and prior capture holds remain unchanged.

The same v99 return captures the unchanged v98 v6 constructor source. Its engine
replay has144 observed contrary cells in literal NEW transparency/equalities and
related cross-route comparisons, plus3,824 exact non-index cells and64 excluded
absolute-index cells. Complete engine vectors equal the assigned batch76 base on
Node24 and22; no v6 behavior is changed. Native direct RGB12.5/DF controls are1,
unlike the v5 root's0. These are separate version/context observations, with no
new constructor parity credit or closure of the pre-existing v6 cast hold.

The managed `oracle-probes/` checkout is external evidence and is excluded from
package source linting. Fixture guard/verify still check its pinned bytes; native
capture-tool JavaScript is not application JavaScript.
