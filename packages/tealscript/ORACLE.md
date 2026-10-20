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


V102 stacking consumes only the four returned v5/v6 false/true sources at
`8606897ec777cca3ad18e755b7c0d99a486d777e`. Their 384 primary source plot cells
each include 32 absolute-index context cells, which earn no replay parity credit.
Original-source replay checks the ten supported numeric/blank properties and
chart time exactly (352 comparisons each), from a phase-zero closed suffix
through its unique anchor; no source/index rewrite, output seed or invented prefix.
The 21 unreturned sources and other/developing rows receive no score.

Native PNG/region bindings pin polyline above line and box above polyline in both
creation directions, and the false/true default/explicit plot-fill controls.
Shared web/native drawing paint follows those witnessed pairs. Polyline-label
and actual table intersections remain UNDECIDED, with explicit hold assertions;
no generic group completeness, raster, font or hidden-identity parity is claimed.

## V102 copy appearance v5

The [v102 v6 return](https://github.com/Tealstreet/tealscript-oracle/blob/db3199acaebfa812fae9066c983d14bc54fc831e/v102/captures/v102/RESPONSE-v102-v6.md) binds the unchanged v5 copy source to its original CSV, PNG and derived region map. Its earliest 32 certified closed rows yield 448 exact numeric/blank property comparisons plus 32 timestamp controls; the 32 absolute-index cells and all other/developing rows receive no primary parity credit. Replay retains the exact source, aligns the four eight-phase cycles, and excludes its local following context bar. The per-bar construction/deletion body has no carried prefix state; relative getters do not establish the omitted own-origin prefix.

A separate replay through the source-owned closed visual anchor locks the emitted line/box/label copy fields to the three PNG-bound appearance verdicts. Copies retain the original blue thick dashed line, yellow solid-blue-border box with independent blue text, and blue centered large label with independent white text while the source objects change. These are finite appearance-output contracts, not exact raster, font, DPI, native token or cross-session identity claims. The original PNG/region uncertainty and all historical holds remain intact. The [v14 return](https://github.com/Tealstreet/tealscript-oracle/blob/6fba2a043155ecfd52bec4fbffb9f03144066ab3/v102/captures/v102/RESPONSE-v102-v14.md) consumed the v6 copy slot at native source entry before Save/Add: no CSV or rendering PNG exists. All14 numeric properties and all three appearance cases remain UNDECIDED/HELD, with zero transferred credit. Partial editor text is not executed source or rendering evidence. The engine already matches this bounded v5 evidence; the new tests are mutation-proven regression locks.


## V103 copy appearance v6

The [v19 return](https://github.com/Tealstreet/tealscript-oracle/blob/0bda1a440f03f92334f5f95babaa5021bc7a7e15/v103/captures/v103/RESPONSE-v103-v19.md) supplies a separate successful v6 execution. Rows307–338 are its32 closed primary rows, with eight original predecessors299–306; row339 is developing and excluded. Unchanged-source replay starts at the first captured phase-zero row7 and stops at the owned anchor338. Nine plot columns provide288 exact value/blank comparisons. The64 cells in INPUT_INDEX and VISUAL_ANCHOR_INDEX are translated index/presence context, never own-origin credit. Each of the three build getters has one finite event and31 intentional blanks.

The original PNG and frozen region map directly distinguish independent copies from mutated-source appearance: blue6 dashed line at85, yellow box with solid blue border and blue COPY text, and blue centered COPY label with white text. Copy and independent-constructor patches match in the native PNG; real web/native painter gates check the corresponding strokes, fills, text and label body classes. This is a regression lock with production mutations. It does not recover the original v102 v6 entry stop, hidden identities, omitted prefix, font/DPI/zoom, universal raster metrics or historical holds.

## V102 v6 twins

The [v26 return](https://github.com/Tealstreet/tealscript-oracle/blob/f47a4e34ce33441ad37add124d9572119826138d/v102/captures/v102/RESPONSE-v102-v26.md) separately binds v6 coordinate, box-text, table-relocation, linefill and both line-price sources. Their192 selected rows provide2,688 exact non-index cells, including2,240 registered property cells; all192 absolute indices remain context only. Coordinate replay retains eight actual closed predecessors. No v5 result substitutes for a v6 export.

V6 coordinates add the observed box.set_xloc delta0. Box text retains complete paired-recipe matching and the vertical alignment subfacet; wrapping, horizontal alignment and isolated bold/italic effects remain held. All four v6 table visual facets remain UNDECIDED: the PNG has no independently readable tables. Its primary3/2/1/2 numeric vector is separate from the developing2/1/1/0 vector, which stays excluded. Linefill tracking and post-delete absence have their own v6 PNG; same-pair intermediate appearance and all line-price visuals remain held. The line-price timing correction places Download and PNG in the same clock bar, while preserving visual holds and unknown frame identity. The v6 copy entry stop remains held with no Save/Add or execution credit.

V102 consumers share `tests/fixtures/v102Fixture.ts` for an independently reviewed
oracle revision, SHA/length-checked reads, CSV decoding and unchanged-source execution. Family
consumers retain their own row windows, runtime options, assertions and holds.
The loader rejects manifest revision drift; review and update its literal together
with the manifest when adopting new captures.
The web/native recorders share `tealchart/src/test/v102Paint.ts`; family adapters
retain the recorded fields used by their finite paint contracts.

## V103 isolated stacking pairs

The [v13 return](https://github.com/Tealstreet/tealscript-oracle/blob/1aad8cc2b41f53bd85b0c5558b36365d371b7244/v103/captures/v103/RESPONSE-v103-v13.md)
adds independent v5/v6 polyline-label plates and v6 table-over-line/polyline/box/label/linefill
plates. Labels cover both orange lanes despite opposite creation orders; each
opaque table covers its single subject while that subject remains visible outside.
The unchanged engine already matches. Real web/native painter and bitmap locks
bind these seven finite verdicts to their original PNGs and derived maps.

Each source contributes 32 closed rows and eight original closed predecessors.
The unchanged source executes an actual phase-aligned exported prefix through its
one-time retained anchor, with neither fabricated history nor native output seeds.
Of 1,792 native primary positions, 1,561 numeric/blank cells compare exactly and
231 absolute-index positions remain translated context. Each build-marker channel
contains one event and 31 intentional blanks. These counts include time, phase,
scale and presence controls; they are not new numeric drawing getter observations.

These captures originally used the append-only 287ebfc1 pin for the shared v102
loader and independent v103 revision literal. The v13 captures first landed at 1aad8cc2.
V102's occluded polyline-label/table cases retain their original
UNDECIDED verdicts. V5 table precedence, polyline arrow
topology, universal raster/font metrics and historical context holds receive no
credit from these seven captures. The table-over-label PNG leaves its middle label
line obscured; only the visible upper/lower body controls receive visual credit.

## V103 visible gap captures

The v5/v6 visible-gap locks use oracle `c1d406006d80e2edc4d16d2952b503bf9dff0dc4`
and the original RESPONSE-v103-v6 sources, CSVs, PNGs and derived maps. The
unique retained closed anchor selects A-31..A, with eight original predecessors.
Replay uses only actual main-chart OHLCV/time, starting at an observed phase-zero
row so the translated local index preserves modulo eight. Both absolute-index
channels are context projections and receive no native parity credit. There is
no own-origin startup claim, invented timestamp continuity or native-output seed.

OFFSET1's raw CSV is SCREEN_ALIGNED, independently distinguished from the
refuted SOURCE_SERIES prediction. Numeric comparison samples the engine source
at destination minus offset; the real plot painters separately apply the offset.
The original PNGs/map support four finite line/area holes and four marker pairs
per version, plus the v6 dashed-stroke class on three nonmissing falling segments.
Web legacy, indicator-pane and unified painters and both native projection routes
consume the replayed outputs. They assert topology, displacement and stroke class,
not exact native raster or dash-period equality. The two step-half-bar facets
remain UNDECIDED because the preregistered uncertainty cannot separate the models.
Developing, other closed and replay-context rows receive zero primary credit;
native frame, font, DPI, zoom, unreturned slots and historical holds remain held.

## V103 noncoincident point setters v1

The [v18 return](https://github.com/Tealstreet/tealscript-oracle/blob/cd1fcda33e7bae9198823468495f6cb6feb05145/v103/captures/v103/RESPONSE-v103-v18.md)
independently captures v5 and v6 line first/second points, box top-left/bottom-right
points, label points and copied fields after subsequent point mutations. Each
version's original PNG and frozen map separate all six model A outcomes from
ignored setters and later live point fields. Real web and native painters replay
the unchanged source into a canvas and check the assigned and competing locations.
These finite position checks do not establish exact native raster or font metrics.

Each 32-row block contributes 479 exact numeric/blank comparisons and 33 translated
absolute-index context cells. The eight getter channels each contain one closed
build event and 31 intentional blanks. Replay starts at the first actual exported
modulo8-zero input and retains the exported prefix through the unique closed anchor,
including its eight original predecessors; no invented bars, output seed or source
rewrite supplies the build guard. Every other closed/developing row stays excluded.
The label's intermediate time-mode getter delta is numeric only; its final index-mode
pixels do not observe the intermediate mode flag. All historical holds remain intact.
The engine already matches these captures; tests lock the regression with mutations.

The [v103 v22 return](https://github.com/Tealstreet/tealscript-oracle/blob/ac9d6992d6d84e296c58dca98fb6b707224d55a1/v103/captures/v103/RESPONSE-v103-v22.md)
binds the v5 extend-stroke plate and separate retained-replacement v5/v6 plates.
Their 96 selected closed rows supply 861 exact non-index cells (489 present,
372 intentional blanks); 99 absolute-index cells remain excluded. Each linefill
COUNT/PARENT channel supplies one event and 31 blanks. Original PNGs and frozen
windows distinguish row-owned extension/stroke/width classes, a single blue fill
following moved parents, and deletion of the independent right replacement with
positive parent/left-fill controls through both painters. Raster metrics, hidden
handle identity and a universal alpha law remain held; v102 v5 entry stops receive
no retroactive execution credit. This is a mutation-proven regression lock.

## V103 plot and polyline style controls

The [complete v103 return](https://github.com/Tealstreet/tealscript-oracle/blob/04a6378c310ef405448e5eea719bf4bc0e699e1a/v103/captures/v103/RESPONSE-v103-v29.md)
separately binds seven unchanged sources: v6 polyline fill/style, plot/hline
fillgaps overloads, plot controls, markers, plotarrow height, and v5/v6 polyline
arrows. Each uses the unique retained closed anchor A and own A-31..A, with
eight original closed predecessors retained. Exact replay supplies real exported
OHLC/time/volume from an earlier modulo32-aligned closed row through A; no source,
index expression or native result seeds the engine. The two absolute-index
columns translate only as context, yielding 2,048 exact scored cells (1,562 finite
and486 intentional blanks), with448 index cells excluded. COUNT has one build
event per polyline source; its31 blanks are not31 additional getter observations.
Other closed rows and developing snapshots receive no primary score.

Original PNGs and their SHA-bound region maps independently support26 finite
visual facets. Real web/native painters lock filled closed dashed triangles,
copied point fields and deletion; plot fill holes versus bridging and positive
hline fill; adjacent circle joins, old-tail suppression and tracker presence;
relative square size, absolute upper-square placement and literal X; relative
positive arrow heights; and v5/v6 open stroked polyline chevrons on the supplied
first/last/both endpoints. Both arrow versions earn their own native evidence;
no line-to-polyline or version-to-version transfer is used. The26 facets are
qualitative topology/visibility/location classes, not exact dash periods, marker
metrics, glyph raster, color compositing or universal pixel equivalence.

The plotarrow sign-direction facet remains UNDECIDED with zero visual credit;
a direction-only painter mutation stays GREEN. Native font/DPI/zoom and hidden
frame identity remain unobserved. Marker PNG axes are actually expanded, and
show_last PNG tails include a developing bar: tests assert historical suppression
and a positive tail, without treating the last-four-closed marker positions as
native pixel witnesses. Full CSV series values remain separate from visibility.
The existing engine and painters already match these finite observations;
production-fault mutations establish regression coverage without an engine fix
or mobile worker regeneration. Historic holds1/2/7/8/13/14/21 remain unchanged.

Each style assertion attaches to its source-owned spatial identity: triangle
footprints and arrow tips, plot value lanes and CSV phase rows, and individual
square/glyph anchors. Palette-preserving real-painter swaps go RED, including
plot/hline fill colors and X/square positions. Equivalent disjoint polyline paint
order stays GREEN; this capture does not witness hidden creation/traversal order.

## V104 width-dependent dash periods

The [v5 return](https://github.com/Tealstreet/tealscript-oracle/blob/5c8a503d7b6cc1c161f75d484b5340ebc459a55b/v104/captures/v104/RESPONSE-v104-v5.md) binds the unchanged v6 source, original CSV and PNG. Its three separated blue horizontal lanes own widths1/4/8, identical spans29, and different value anchors85/65/40. Independent native PNG profiles establish period ratios1:4:8 (SUPPORTED_B), refuting constant period. Real web/native painter commands and per-lane raster profiles lock each lane's own width, position and period; swapped lanes and one-sided faults are separately rejected.

Replay uses only actual captured OHLC/time/volume from the first observed modulo8-zero row through the owned closed build. The selected A-31..A block yields288 exact non-index numeric/blank cells and64 translated index-context cells with zero absolute-origin credit. Each build getter supplies one finite event and31 intentional blanks. No output seeds, invented bars or native outputs enter execution. Other/developing/context rows receive no primary credit.

Dotted strokes, boxes, polylines, plot/hline styles and earlier Pine versions inherit width scaling through the shared recipe as an explicit inference, separately regression-tested without additional native credit. Existing width1 recipe lengths and dash/gap proportions are retained as engine policy, not native-certified absolute metrics. The older copy comparison's local constructor recipe and width2 worklet expectation follow this same inferred correction; neither older capture certified a numeric period. Native DPI, absolute pixel lengths, phase/reset/clipping laws and historical holds remain held.

## V104 finite glyph advance

The v6 glyph slot at oracle `811a4d79` supplies one retained four-label plate:
monospace I/W body widths agree within the preregistered edge uncertainty, while
default-font I/W controls differ. Original source, CSV, PNG and map bindings are
separate from the local font recipes exercised through web and native painters.
The append-only fixture union includes v4 integrity dependencies; other v104
slots receive no scoring credit from the glyph lock.

The fixed A-31..A block contains 384 native cells. Unchanged-source replay
compares 351 numeric/blank cells exactly, including 186 intentional blanks;
33 absolute-index cells remain translated context. Four position getters each
contribute one build observation, not 32 repeated getters. Original predecessors
remain context; developing rows are excluded. Native font identity, fractional
advances, padding, DPI/frame/zoom and universal raster claims stay held.

## V104 v5 box wrapping and alignment

The [v104 return](https://github.com/Tealstreet/tealscript-oracle/blob/1faebe5ac656714b4177c9acbdb5e1e411e8e9b2/v104/captures/v104/RESPONSE-v104-v2.md)
binds two unchanged sources, each with one retained closed build and its fixed
A−31..A block. Exact replay scores 638 cells, including 310 intentional blanks;
66 absolute-index cells remain observed exclusions. Three span getters per source
are one build event each, not 32 independent getter observations.

Original PNG and region-map bindings retain complete wrapped/nowrap captions and
three position-bound EDGE alternatives. Real web/native painters additionally
match an independent local canvas reference at the frozen source coordinates.
Local line choices use active font measurement, tested with system and DejaVu-only
fonts. Exact native glyph/DPI/padding metrics, hidden frame identity, unrelated v104
slots and universal composition remain held with zero added credit.

The [v104 vertical delta](https://github.com/Tealstreet/tealscript-oracle/blob/04a6378c310ef405448e5eea719bf4bc0e699e1a/v104/captures/v104/RESPONSE-v104-v11.md)
adds the separate v5 top/center/bottom plate: 319 exact cells (155 intentional
blanks), 33 excluded absolute-index cells and one retained build. Its original
PNG certifies each complete EDGE caption and six box top/bottom boundaries;
the third box is seven bars wide, while the first two are eight. Independent
web/native local raster references bind those same identities across host fonts.
The combined three-source score is 957 exact cells, 465 blanks and 99 excluded
index cells. No other v11 source earns credit here; native raster metrics stay held.

V104 step-turn v5/v6 at oracle `735d1b50` supplies two independent PNG/CSV/certificate
joins for phase8 and phase24: native plain stepline turns occur at X(t)-b/2.
Both web and native painters use that half-slot boundary and retain the sample
centre after the vertical. `steplinebr` and `stepline_diamond` remain unchanged.
The locks score 640 exact primary values/blanks, with 128 translated absolute-index
context cells excluded from numeric credit. Each source replays an original
modulo32-aligned exported prefix through its own retained anchor, preserving eight
original predecessors and giving startup/developing/other rows zero credit.
Raw PNG samples preserve their encoded channels without ICC conversion.
The former centre-turn synthetic PNG is replaced by an independent exact
half-slot raster constructor; the drift tolerance is not increased.

Composition controls combine those unchanged replay inputs with local dashed/dotted,
width1/4/8 and scalar/series-colour plot overrides through all six painter routes.
They bind each own half-slot turn to its width-scaled pattern and painted ink,
without native dashed-stepline, absolute period or phase/reset credit.
