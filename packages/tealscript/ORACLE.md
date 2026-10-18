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

## Constant color controls v5

The [v98 partial constructor return](https://github.com/Tealstreet/tealscript-oracle/blob/329631f43d8c38a944f8c016e98131f4351f48aa/v98/captures/v98/RESPONSE-v98-v2.md) distinguishes v5 literal-argument `color.new` from series constructors. Literal NEW matches truncating transparency before byte conversion across the sixteen captured cases. Its four case13 nonmatches at T22.9 remain actual all-zero equality vectors: truncation predicts alpha199 outside the supplied194..198 palette, but equality to that predicted literal was not exported. All four original frozen NEW hypotheses remain refuted; matching the getter/equality vector does not recover hidden storage.

The engine now uses the CM-B arithmetic witness on the observed constructor surface. Constant RGB and NEW share `Math.round(255 * (1 - t / 100))`, with NEW first truncating transparency. V5 immediate constant comparisons retain separate constructor/literal float32 normalization, GBAR packing and exact one-decimal comparison keys; materialized colors retain byte storage. V6 changes only constant NEW's byte conversion. Series constructors and missing-color paths retain their behavior. The primitive operations apply to values, with no probe names or literal palettes in production code.

The [complete v98 return](https://github.com/Tealstreet/tealscript-oracle/blob/b23c3d71f00e83cb40c4ab3d65be269788605f89/v98/captures/v98/RESPONSE-v98-v6.md) supplies the missing v5 cast discriminator: `color(na)` has finite0/0/0/100 getters, NA0 and equality to transparent black. Var/array/history transfers retain it, and nz retains the present value. The v5 cast now produces transparent black; typed color NA retains its own missingness. The v5 NA-cast census predicate remains independently locked; the constant-color regression now also covers the v96 direct RGB root.

The original v98 constructor-v6 slot remains consumed/UNOBSERVED after entry failure. Its later v99 retry is a separate capture; batch78 now reproduces all3,968 non-index constructor cells, including the144 cells previously held by batch77. The v96 v6 controls remain exact.

### V99 direct v5 constructor evidence

The1273152e return binds both unchanged v5 direct-comparison probes and all8,064
primary plot cells. All five frozen comparison policies, including both prior
v96/v98 RGB candidates, are REFUTED. The observation-only regression preserves
native getter/equality/calibration values. At that v99 frontier, finite
equality-relation completions disagreed on an unqueried immediate RGB/NEW
comparison; v100 now observes it. Those completions are not storage algorithms. The v100-bound engine regression now scores all23,448 selected closed non-index cells across nine constant-color source executions. Both the v96 v5 direct-RGB root and the144 v99 v6 constant-NEW discrepancies match native exactly. Its comparisons assert the original numeric strings and binary64 values without tolerance.

The v6 constructor return supplies3,968 exact non-index cells and64 excluded absolute-index cells after this change. Native direct RGB12.5/DF controls remain1 in v6 versus0 in v5. The composed batch77 cast implementation is documented below and retains its independent source/presence contracts.

The managed `oracle-probes/` checkout is external evidence and is excluded from
package source linting. Fixture guard/verify still check its pinned bytes; native
capture-tool JavaScript is not application JavaScript.

V100's three native slots retain the exact accepted sources and frozen predictions.
Its direct scalar projection supports SC213 (258 representatives); all 108 packing
representative signatures are refuted. Both materialization versions support BC2
(B:104/106/512/514). These independent projections do not identify a full model.
The RGB tuple changes direct equality, so alpha-only scalar storage is insufficient.
Previously grouped packing members must be checked separately from their rejected
representatives. At v100, CM-A and CM-B reproduced every observed constant-color
cell and disagreed on direct RGB-vs-NEW at transparency90. Their alternate-order
mutation stayed GREEN only on that older captured surface.

The [v101 return](https://github.com/Tealstreet/tealscript-oracle/blob/56abd808d88595bab7808c063d065ce2bcd7dc55/v101/captures/v101/RESPONSE-v101-v1.md)
now exports `DIRECT_RGB_NEW_90_EQ=1` on all64 selected owned physically closed
rows. CM-A is REFUTED and implemented CM-B is SUPPORTED on the finite frozen
37-code vector. The new lock compares all2,368 code cells and128 reproducible
context outputs exactly against original CSV strings;64 absolute indices remain
excluded. The CM-A swap now goes RED. The previous23,448 comparisons stay exact.

The source's false/Boolean-NA encoding limit remains; no universal native algorithm,
hidden color identity, missing-color behavior or unqueried input is established.
Other2m closed rows/developing snapshots and prior holds retain their exclusions.

### V6 missing-color cast controls

The [complete v99 return](https://github.com/Tealstreet/tealscript-oracle/blob/bc913c6cc44b40611f84fabc362975df0aa73574/v99/captures/v99/RESPONSE-v99-v6.md) resolves batch77's frozen cast discriminator: ARRAY_EQ_SELF is0 on all64 rows, refuting copied-token identity and supporting stable-initializer folding for the captured sources. Direct literal `color(na)` pairs and unchanged root cast/var aliases compare true. Array/history missing values still compare false at runtime, including to themselves. Equality follows the source's actual previous branch, preserving ordinary DF equality and missing-branch refusal; no row-parity outcome is fitted. The emitter folds only proven stable root cast initializers and pure direct casts in root execution, guarding reassignments, user calls and local/function shadowing. It does not make NaN reflexively equal globally.

V6 literal-cast and explicit typed-color NA origins publish0/0/0/100 independently of NA1, including the newly captured typed-color NA getters. A private engine marker preserves that provenance through arrays/history; it is not a proposed native payload and runtime equality still rejects it as missing. Gradient failures, fixnan warmup and explicit missing nz replacements retain their prior missing-result transport and blank getters. This leaves missingness, NZ fallback, gradients and v5 behavior separate. Every non-index cell of the complete v98 cast and both v99 cast sources compares exactly. Absolute indices and uncaptured own-origin initialization remain excluded. Replay uses captured context rows and rebases phase/index; v99 startup guards stay local on the unscored first bar so an absent prior array is not fabricated. This establishes the bounded cast behavior, not universal optimizer/storage identity or historical-hold closure. The older observation-only countermodels remain frozen v98 evidence; they are not production adapters.

## V102 copy appearance v5

The [v102 v6 return](https://github.com/Tealstreet/tealscript-oracle/blob/db3199acaebfa812fae9066c983d14bc54fc831e/v102/captures/v102/RESPONSE-v102-v6.md) binds the unchanged v5 copy source to its original CSV, PNG and derived region map. Its earliest 32 certified closed rows yield 448 exact numeric/blank property comparisons plus 32 timestamp controls; the 32 absolute-index cells and all other/developing rows receive no primary parity credit. Replay retains the exact source, aligns the four eight-phase cycles, and excludes its local following context bar. The per-bar construction/deletion body has no carried prefix state; relative getters do not establish the omitted own-origin prefix.

A separate replay through the source-owned closed visual anchor locks the emitted line/box/label copy fields to the three PNG-bound appearance verdicts. Copies retain the original blue thick dashed line, yellow solid-blue-border box with independent blue text, and blue centered large label with independent white text while the source objects change. These are finite appearance-output contracts, not exact raster, font, DPI, native token or cross-session identity claims. The original PNG/region uncertainty and all historical holds remain intact. The [v14 return](https://github.com/Tealstreet/tealscript-oracle/blob/6fba2a043155ecfd52bec4fbffb9f03144066ab3/v102/captures/v102/RESPONSE-v102-v14.md) consumed the v6 copy slot at native source entry before Save/Add: no CSV or rendering PNG exists. All14 numeric properties and all three appearance cases remain UNDECIDED/HELD, with zero transferred credit. Partial editor text is not executed source or rendering evidence. The engine already matches this bounded v5 evidence; the new tests are mutation-proven regression locks.
