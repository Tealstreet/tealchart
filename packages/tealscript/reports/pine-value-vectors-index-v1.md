# Pine Value Vectors Index V1

Audited value-vector and corpus-profile figures through the source reports
listed below.

## Authoritative Metric Routes

Use this table first. Older reports in this directory are historical
measurements and may have been correct only for the commit named in that file.

| Question | Current report | Measurement commit | Current figure |
| --- | --- | --- | --- |
| What is the value-vector gate result? | `pine-value-vector-red-first-exemptions-v1.{md,json}` | current synced tree after `ce8987c62a` | `pine:value-vectors` current run: `997/998` passing; `1` expected-red (`strategy.calc-on-order-fills-values`); source citations, citation-completeness, expected-red metadata, and red-first proof/exemption checks enforced |
| Which official members have vector coverage? | `pine-value-vector-live-reference-denominator-v3.{md,json}` | `d9d1620246` | live-reference corrected `814/886`; snapshot artifact `814/861`; `0` missing implementations in the `25` live-only names |
| How load-bearing are those vectors? | `pine-value-vector-assertion-quality-v10.{md,json}` | `d9d1620246` | `786` value-checked, `23` property-only, `5` ran-only |
| Are value expectations engine-derived? | `pine-value-vector-oracle-provenance-v7.{md,json}` | `d9d1620246` | `786/786` do not call TealScript execution, `0` engine-derived; this does not prove derivation correctness |
| What source are value oracles derived from? | `pine-value-vector-oracle-source-provenance-v6.{md,json}` | `2646080db3` plus runtime visual triage | passing cases: `979` live-doc-cited, `1` local extension, `0` snapshot-cited, `0` missing citation, `0` incomplete citation |
| Which vectors need derivation review by shape? | `pine-value-vector-derivation-suspicion-v1.{md,json}` | `affebaee44` plus this audit | `433/989` flagged; top families `ta` `296`, hostile `71`; known counterexamples `5` |
| Which optional args and overloads are covered? | `pine-value-vector-depth-v42.{md,json}` | `d9d1620246` | optional args `457/471`, strict overloads `10/10` |
| Which invalid-input domains are covered? | `pine-input-domain-map-v1.{md,json}` | `3cbadb64dd` | `93/861` documented-domain members; `244/244` TA length refusals |
| What property lens should corpus audits use? | `pine-member-property-map-v3.{md,json}` | `2646080db3` | `851/861` members, `992` rules; denominator corrected by removing invalid `str.split:string-domain` |
| How much of the property lens is known-good validated? | `pine-member-property-validation-filter-v14.{md,json}` | `2646080db3` | `897/992`, `0` known-good fires |
| Why are property rules still unvalidated? | `pine-member-property-unvalidated-rules-v2.{md,json}` | `2646080db3` | `95` unvalidated: `93` structural/evidence-bound ceiling (`49` side-effect, `44` trace/provider/host/opaque), plus `2` branch-state expected-reds |
| What do shipped studies use? | `shipped-pine-study-member-inventory-v2.{md,json}` | `9265ad760d` | `0/50` trace/host members; `0` unsettled interior-hole exposures |
| What do public corpora expose to trace-required members? | `pine-value-vector-corpus-exposure-v1.{md,json}` | `a0bc78427f` | `488/2000` trace/host; `66/2000` confirmed unsettled interior-hole |
| What trace should be acquired first? | `pine-trace-purchase-order-v2.{md,json}` | `c5bb54427c` | buy 1: one static export settling `66/2000` scripts; buy 2 narrowed to live barstate ticks at `36/2000`; buy 3 `timenow` at `35/2000`; buy 4 realtime `varip` at `19/2000` |
| What are current v5/v6/v7 daily corpus acceptance figures? | `external-pine-corpus-version-rule-batch-rerun-v1.md` and `external-pine-corpus-v5.daily-rerun-8db55d66ae.json` and `external-pine-corpus-v6.daily-rerun-8db55d66ae.json` and `external-pine-corpus-v7.daily-rerun-8db55d66ae.json` | `8db55d66ae` | v5 `867/925`, v6 `787/935`, v7 `305/400` achievable |
| What is the calibrated v5 context-stress figure? | `external-pine-corpus-v5.fixture-profile-delta-v8.md` | `34259f21e0` | `865/923` achievable |
| What is the calibrated v6 context-stress figure? | `external-pine-corpus-v6.fixture-profile-delta-v3.md` | `060d8c2ad1` | `786/934` achievable |
| What is the calibrated v7 context-stress figure? | `external-pine-corpus-v7.fixture-profiles-v1.md` | `2e05553bda` profile at commit `1d103e1ea6` | `292/401` achievable |
| Is the parse stage closed? | `external-pine-corpus-parse-stage-census-20260911.md` and `external-pine-corpus-v7-parse-stage-census-20260911.md` | `a75ebd88d7`, `69c43143ac` plus parser changes | `0` parser-owned rows after named fixes |
| Are structural parser invariants clean? | `external-pine-corpus-ast-structure-invariants-20260911.md` | `aa2aec76c2` plus `3fd2a84096` | `0` precedence rows across `2419` parse-passing sources |
| Which Rule 6 verifications are open? | `pine-rule6-backward-audit-v8.md` | `0b1f0bfc48` | `15` current open/trace-shaped verifications; host-default and version reds are pre-positioned for other lanes; historical `islastconfirmedhistory` boundary closed |
| Are centralized Pine version rules independently sourced? | `pine-version-rules-independent-audit-v1.md` | `e2633cf146` | `21/21` current table rules supported; `0` unsupported; `13` documented migration changes missing from the table |
| Are the 13 missing version rules enforced elsewhere? | `pine-version-rule-engine-probe-v1.md` | `d9009a84d4` | `5` enforced correctly outside the table, `4` enforced wrongly, `4` not enforced |
| Are hostless context defaults externally bounded? | `pine-host-context-default-oracles-v1.md` | `3c2b8825e1` | `4` shape oracles green; `1` documented-value expected-red for `chart.fg_color`; exact host values remain trace/host-bound |
| Is the historical half of `barstate.islastconfirmedhistory` externally closed? | `pine-barstate-lastconfirmedhistory-oracles-v1.md` | `0b1f0bfc48` | `3` documented vectors green across historical-only, realtime-last-only, and multi-bar realtime-segment host shapes |

Source reports:

- `pine-value-vectors-coverage-v174.json`
- the generated coverage snapshot (series no longer committed — regenerate with `pine:value-vectors`)
- the generated coverage snapshot (series no longer committed — regenerate with `pine:value-vectors`)
- the generated coverage snapshot (series no longer committed — regenerate with `pine:value-vectors`)
- the generated coverage snapshot (series no longer committed — regenerate with `pine:value-vectors`)
- `pine-value-vectors-ta-invalid-length-v1.md`
- `pine-value-vectors-ta-invalid-length-v1.md`
- `pine-input-domain-map-v1.md`
- `pine-input-domain-map-v1.md`
- `pine-value-vector-member-map-v31.md`
- `pine-value-vector-member-map-v31.md`
- `pine-value-vector-live-reference-denominator-v3.md`
- `pine-value-vector-live-reference-denominator-v3.md`
- `pine-value-vector-depth-v42.md`
- `pine-value-vector-depth-v42.md`
- `pine-value-vector-invariants-v2.md`
- `pine-value-vector-assertion-quality-v10.md`
- `pine-value-vector-assertion-quality-v10.md`
- `pine-value-vector-oracle-provenance-v7.md`
- `pine-value-vector-oracle-provenance-v7.md`
- `pine-value-vector-oracle-source-provenance-v6.md`
- `pine-value-vector-oracle-source-provenance-v6.md`
- `pine-value-vector-derivation-suspicion-v1.md`
- `pine-value-vector-derivation-suspicion-v1.json`
- `pine-value-vector-discrimination-audit-v1.md`
- `pine-value-vector-discrimination-audit-v1.json`
- `pine-value-vector-red-first-exemptions-v1.md`
- `pine-value-vector-red-first-exemptions-v1.json`
- `pine-value-vector-helper-provenance-audit-v1.md`
- `pine-value-vector-helper-provenance-audit-v1.json`
- `pine-value-vectors-v7-gap-coverage-v1.md`
- `pine-member-property-map-v3.md`
- `pine-member-property-map-v3.json`
- `pine-member-property-map-validation-v14.md`
- `pine-member-property-map-validation-v14.json`
- `pine-member-property-map-shipped-validation-v3.md`
- `pine-member-property-map-shipped-validation-v3.json`
- `pine-member-property-validation-filter-v14.md`
- `pine-member-property-validation-filter-v14.md`
- `pine-member-property-unvalidated-rules-v2.md`
- `pine-member-property-unvalidated-rules-v2.md`
- `shipped-pine-study-member-inventory-v2.md`
- `shipped-pine-study-member-inventory-v2.md`
- `pine-value-vector-corpus-exposure-v1.md`
- `pine-value-vector-corpus-exposure-v1.json`
- `pine-trace-purchase-order-v2.md`
- `pine-trace-purchase-order-v2.md`
- `pine-varip-trace-exposure-v1.md`
- `pine-varip-trace-exposure-v1.json`
- `tradingview-ta-hole-trace-v1.pine`
- `tradingview-realtime-barstate-trace-v1.pine`
- `tradingview-timenow-trace-v1.pine`
- `tradingview-varip-replacement-trace-v1.pine`
- `packages/tealscript/scripts/import-tradingview-ta-hole-trace.ts`
- `packages/tealscript/scripts/import-tradingview-realtime-trace.ts`
- `pine-corpus-member-map-v1.md`
- `pine-corpus-member-map-v1.json`
- `pine-corpus-v7-harvest-spec-v1.md`
- `external-pine-corpus-daily-rerun-a75ebd88d7-v1.md`
- `external-pine-corpus-v6.daily-rerun-a75ebd88d7.json`
- `external-pine-corpus-v5.daily-rerun-a75ebd88d7.json`
- `external-pine-corpus-v6.remaining-gap-dispatch-v1.md`
- `external-pine-corpus-v6.fixture-profile-delta-v1.md`
- `external-pine-corpus-v6.fixture-profile-delta-v2.md`
- `external-pine-corpus-v5.remaining-gap-dispatch-v5.md`
- `external-pine-corpus-v5.fixture-profile-delta-v8.md`
- `external-pine-corpus-v5.fixture-profile-delta-v3.md`
- `external-pine-corpus-v5.rerun-014ff37f39-v1.md`
- `external-pine-corpus-current-error-rerun-v1.md`
- `external-pine-corpus-current-error-rerun-v1.md`
- `external-pine-corpus-version-rule-batch-rerun-v1.md`
- `external-pine-corpus-v5.daily-rerun-8db55d66ae.json`
- `external-pine-corpus-v6.daily-rerun-8db55d66ae.json`
- `external-pine-corpus-v7.daily-rerun-8db55d66ae.json`
- `external-pine-corpus-parse-stage-census-20260911.md`
- `external-pine-corpus-semantic-stage-census-20260911.md`
- `external-pine-corpus-v7-parse-stage-census-20260911.md`
- `external-pine-corpus-v7-semantic-stage-census-20260911.md`
- `external-pine-corpus-ast-structure-invariants-20260911.md`
- `pine-rule6-backward-audit-v8.md`
- `pine-version-rules-independent-audit-v1.md`
- `pine-version-rule-engine-probe-v1.md`
- `pine-host-context-default-oracles-v1.md`
- `pine-barstate-lastconfirmedhistory-oracles-v1.md`
- `packages/tealscript/scripts/run-pine-value-vectors.ts`

## Current Figures

The denominator correction is material: the official manual snapshot contains
861 names, while 489 is only the requested-scope contract audit. Use the
following accounting when quoting coverage:

| Metric | Figure | Denominator |
| --- | ---: | --- |
| Official names resolved | `848/861` | All names in the committed official v6 manual snapshot. |
| Independent value vectors | `980/989` passing | Committed deterministic vector cases, not builtin members. Source citations and citation completeness are enforced by the value-vector gate. |
| TA invalid-length rejection vectors | `244/244` | 61 documented TA length slots reject zero, negative, fractional and non-finite values. |
| Input-domain rejection vectors | `244` | 244 green TA length cases. Dynamic out-of-range `color.rgb()` and legacy `bgcolor(transp=...)` consequences are trace-undetermined: the docs state valid ranges, not whether invalid runtime inputs reject, clamp, or follow another behavior. |
| Contract audit | `489/489` reviewed | Requested namespace subset only. |
| Snapshot-artifact value coverage | `814/861` | Member-to-case map generated against the committed official v6 manual snapshot. This is not the full live-reference denominator. |
| Live-reference-corrected value coverage | `814/886` | Current total-member answer to "how much of Pine do we cover": committed snapshot denominator plus live-documented callable names absent from the snapshot. The `25` live-only names are implemented but evidence-bound, not missing features. |
| Engine-derived frozen value snapshots | `0/786` | Value-checked members whose expectation is produced by running the TealScript engine. |
| Snapshot-derived value oracles | `0/980` | Passing value-vector cases whose oracle source is the committed reference snapshot. The snapshot still affects names, signatures and denominators. Citation completeness is separately guarded after the `matrix.sort:sort_field` source-completeness reversal. |
| Derivation-suspicion queue | `433/989` | Cases whose expectation shape needs derivation review before citing the suite as independently sound: empty/all-null/all-zero outputs, complex local helpers, long float literals, and the corrected hline/extrema-bars counterexamples. |
| Load-bearing property assertions only | `23/814` | Covered members with a derived invariant but no settled exact value oracle. |
| Ran-only coverage | `5/814` | Covered members that appear only as scaffolding, dependencies, or trace-required exact-value placeholders. |
| Reference-derived property map | `851/861` | Corpus-facing member-to-property lens; catches impossible ranges, shapes, constants, tuple coherence and side-effect-only output without TradingView traces. The current map has `992` rules after removing invalid `str.split:string-domain`. |
| Property-map validation filter | `897/992` | Mechanical output-to-member attribution, scalar proxy validation, bounded drawing/table/plot payload validation, attributed collection validation, and constructed single-target vectors. Remaining rules are structural/evidence-bound or expected-red. |
| Practical no-trace value coverage | `814/814` | Excludes 48 trace/host-required official names. |
| Shipped Pine study trace/host-required usage | `0/50` | Checked-in Tealchart/app Pine templates do not reference trace/host-required members. |
| Shipped Pine study unsettled-TA usage | `10` | Eight are fed only non-hole chart sources; two can see leading warm-up `na`; zero can see interior holes. |
| Public corpus trace/host-required usage | `488/2000` | Pinned v5/v6 corpus scripts referencing at least one trace/host-required member. |
| Public corpus unsettled-TA interior-hole exposure | `66/2000` | Confirmed mid-series hole routes into unsettled TA policies; 189 more scripts have unresolved static UDF/object-state exposure. |
| Trace purchase order | `66`, `36`, `35`, `19` | Measured buys: static unsettled-TA interior-hole export, live barstate ticks, `timenow`, then realtime `varip` replacement. |
| Value-vector optional argument depth | `457/471` | Documented optional `member:param` slots exercised by current vectors. |
| Value-vector strict overload depth | `10/10` | Explicit overload rows uniquely selected by current vectors. |
| Corpus structural member coverage | `658/861` | Official names explicitly referenced by at least one pinned v5/v6 corpus source. |
| Corpus+vector structural coverage | `829/861` | Official names referenced by either a pinned corpus source or a value-vector case. |
| Structurally exercised by nothing | `32/861` | Official names referenced by neither pinned corpus source nor value-vector case. |

Use this table when quoting value-vector coverage. Older `blind-spot` and
`coverage` reports are historical artifacts and may carry superseded headline
counts.

| Metric | Current figure | Notes |
| --- | ---: | --- |
| V6 daily corpus profile | `777/935` (`83.10%`) | Current daily rerun at `7c08371da1`; raw result `777/1000`. |
| V6 context-stress corpus profile | `786/934` (`84.15%`) | Latest registry-enabled profile at `060d8c2ad1`; raw result `786/1000`. |
| V6 chart-context-dependent gaps | `1` | Rows failing on only one calibrated fixture profile. |
| V5 daily corpus profile | `855/925` (`92.43%`) | Current daily rerun at `7c08371da1`; raw result `855/1000`. |
| V5 context-stress corpus profile | `865/923` (`93.72%`) | Latest v5 fixture-profile report at `34259f21e0`; raw result `865/1000`. |
| V7 daily corpus profile | `304/400` (`76.00%`) | Current daily rerun at `7c08371da1`; raw result `304/456`. |
| V7 context-stress corpus profile | `292/401` (`72.82%`) | Latest v7 fixture-profile report at `2e05553bda`; raw result `292/456`. |
| Independent-oracle cases | `989` | Total value-vector cases in the harness. |
| Passing cases | `988` | Current green cases. |
| Expected-red cases | `1` | Known gaps tracked by case id, not regressions. A resolved expected-red produces an unexpected-pass signal before the list is updated. |
| Official member value coverage | live-reference corrected `814/886` (`91.87%`); snapshot artifact `814/861` (`94.54%`) | Use the live-reference-corrected denominator for "how much of Pine do we cover"; the snapshot figure is only the checked-in artifact map. The `25` live-only names split `0` missing / `25` implemented evidence-bound. |
| Load-bearing value assertions | `786/814` (`96.56%`) | Covered members whose vector target is an exact-value or payload assertion. |
| Engine-derived frozen value snapshots | `0/786` (`0.00%`) | Value expectations that call the TealScript execution path. |
| Derivation-suspicion queue | `433/989` (`43.78%`) | Not defects; cases this shape audit cannot confirm as independently derived without reading/re-deriving the expectation. |
| Load-bearing property assertions only | `23/814` (`2.83%`) | Covered members whose only load-bearing target is a derived invariant. |
| Ran-only coverage | `5/814` (`0.61%`) | Covered members with no load-bearing value/property assertion yet. |
| Reference-derived property map | `851/861` (`98.84%`) | Single reusable output-property lens for corpus audits; current denominator is `992` after correcting `str.split` to collection-only. |
| Property-map known-good rule coverage | `897/992` (`90.42%`) | Unique member/kind rules exercised across vectors plus shipped studies before applying the lens to wild corpus output. |
| Property-map validation filter | `897/992` (`90.42%`) | Constructed single-target cases and proxy/payload validators leave only `93` structural/evidence-bound rules plus `2` expected-reds. |
| Input-domain map | `93/861` | Documented-domain members found in this audit: 43 green-vector covered, 1 expected-red runtime gap, 2 trace-undetermined color/transparency groups, 29 semantic-blocked, 18 already loud at runtime; 768 members have no documented invalid-input domain in this audit. |
| Practical no-trace value coverage | `814/814` (`100.00%`) | The 48 trace/host-required names are excluded from this denominator. |
| Optional argument value-depth coverage | `457/471` (`97.03%`) | Optional `member:param` slots from covered callable members. |
| Strict overload value-depth coverage | `10/10` (`100.00%`) | Explicit overload rows that current vectors uniquely select; lenient compatibility is `10/10`. |
| Corpus structural member coverage | `658/861` (`76.42%`) | Explicit official member references across pinned v5/v6 source corpora; source coverage only, not runtime reachability or value parity. |
| Corpus-only structural coverage | `18` | Official names referenced by pinned corpus sources but not by value-vector cases. |
| Value-vector-only structural coverage | `171` | Official names exercised by value vectors but not explicitly referenced in pinned corpus sources. |
| Structurally exercised by nothing | `32/861` (`3.72%`) | Honest boundary of what neither corpus nor value vectors currently touch. |
| V7 harvest-spec trace/host subset | superseded | Recompute harvest targets from the current member map before using the older harvest spec counts. |
| Locally-verifiable members left | `0` | Every member classified locally verifiable has at least one vector case. |
| Trace/provider-exact members left | `48` | Require TradingView traces, provider feeds, or host-exact realtime/session/symbol data. |
| `ta.*` coverage | `74/74` (`100.00%`) | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` coverage | `13/13` (`100.00%`) | Official-library TA wrappers have value vectors. |
| Language categories | `22/23` (`95.65%`) | Realtime `varip` replacement semantics remains trace-shaped. |

## Superseded Figures

- `87/489` was the early builtin value baseline and is superseded.
- `294/489` was the v18 practical-ceiling baseline and is superseded.
- `16/23` was the early language checklist baseline and is superseded by `22/23`.
- `467/489`, `467/471`, `471/489`, and `471/471` requested-scope figures are
  superseded by the full official-surface member map: `582/861` raw and
  `582/825` practical no-trace.
- `856/926` and `716/938`/`719/938` are superseded by the committed fixture
  profile reports listed above.
- `781/934` for v6 daily at `060d8c2ad1` is superseded by the `a75ebd88d7`
  daily rerun: `796/930`.
- `863/923` for v5 daily at `34259f21e0` is superseded by the `a75ebd88d7`
  daily rerun: `872/923`.
- `865/923` and `867/923` for v5 are superseded by the `34259f21e0` fixture
  profile rerun: `863/923` daily and `865/923` context-stress; the daily side
  is further superseded by the `a75ebd88d7` rerun.

## Measurement Limits

The value-vector artifact now proves case-level execution, path agreement, and
member-level coverage against the full official manual snapshot: 989 cases, 976
matches, 13 expected-red cases, and 814 of 861 official names mapped to at
least one vector case. The corpus member map separately proves source-reference
coverage only: 658 of 861 official names appear in at least one pinned v5/v6
corpus source, while 32 names appear in neither corpus nor value vectors. The
older `pine-corpus-v7-harvest-spec-v1.md` was generated before the latest vector
expansion and should be recomputed before using its untouched-member categories.
These are still member coverage measurements, not exhaustive argument and
edge-case coverage for every overload.

`pine-value-vector-assertion-quality-v10` partitions the 814 covered members by
what the harness actually proves. The stricter load-bearing split is 786
exact-value/payload members, 23 property-only members, and 5 ran-only members.
Trace-required TA exact series do not count as value coverage in that partition
because `PINE_TRACE_REQUIRED_v2.md` says their exact seed, hole, and recovery
values remain unsettled.

`pine-value-vector-oracle-provenance-v7` partitions the 786 value-checked
members by expectation origin. It found zero engine-derived frozen snapshots:
no value expectation is produced by executing the engine under test. That is a
narrow guarantee. `pine-value-vector-derivation-suspicion-v1` is the follow-up
audit for the stronger question, and it flags 433 of 989 cases whose expected
value shape cannot be confirmed as independently derived without reading or
re-deriving the expectation. The known counterexamples are extrema-bars/Aroon
and visual hline payloads. `pine-value-vector-discrimination-audit-v1` narrows
that suspicion list: `0` rows are comparator-vacuous, all `272` all-null and
all `38` all-zero rows are length-discriminating against empty output, and the
remaining high-risk class is `129` local-helper rows whose formulas overlap
runtime or official-library formula families (`0` actual shared runtime-code
rows). `pine-value-vector-helper-provenance-audit-v1` then re-asks the
helper question by provenance rather than code sharing: all `129` helper rows
remain second implementations, `36` cite concrete published
formula/composition/equivalent-implementation evidence, `92` only carry broad
family/manual citations, and `1` is trace-qualified. It also closes the seven
known-counterexample/long-float residual rows: extrema-bars and visual hline
were genuinely wrong/stale oracles and are now corrected, while the three
long-float strategy rows decompose to documented arithmetic over committed bars.
A long float literal is therefore a suspicion signal to read, not automatically
evidence of a copied engine value. `pine-value-vector-helper-backfill-priority-v1`
ranks the `92` broad-citation helper rows instead of backfilling them:
`30` rows are in runtime-changed families, and the top queue is `ta.sma`,
`ta.ema`, `ta.atr`, `ta.highest`, `ta.lowest`, `ta.rma`, and `ta.mfi` by
runtime churn plus real corpus exposure. `pine-value-vector-helper-backfill-extrema-rma-v1`
starts that backlog with the extrema-value siblings of the corrected
`highestbars`/`lowestbars` family: `6` `ta.highest`/`ta.lowest` rows now cite
concrete rolling max/min formulas and carry validated red-first proofs. The
same checkpoint records the chain shape before any `rma`-family backfill:
`ta.atr` and `ta.rsi` expectations flow through the local `rma` helper, while
`ta.mfi` does not. `pine-value-vector-helper-backfill-rma-v1` then settles that
load-bearing primitive: `8` RMA rows now cite the published Wilder/RMA formula,
`7` rows carry seed-discriminating red-first proofs, and the remaining overlong
row is a no-seed full-length all-`na` case. With RMA verified, `ta.atr` and
`ta.rsi` can be backfilled as reference compositions on a verified primitive
rather than re-derived from scratch; `ta.mfi` remains standalone.
`pine-value-vector-helper-backfill-sma-ema-atr-rsi-v1` backfills the next usage
queue (`6` SMA, `5` EMA, `4` ATR, `4` RSI) with `0` disagreements. Running
yield is `33` helper rows backfilled and `0` disagreements, with `59`
broad-citation helper rows remaining. It also records that EMA is not an
RMA-style SMA-seeded series: its reference equivalent implementation seeds from
the first non-`na` source value. The red-first gate caught four newly merged
vectors without proof metadata from semantic argument-type/qualifier and
runtime operator/versioned-operator work before this checkpoint went green.
`pine-value-vector-helper-backfill-closure-v1` stops the backfill as
measured-and-deprioritized: the highest-risk `33/92` broad-citation rows held
with `0` disagreements, and the remaining `59` rows stay preserved in the
original ranked queue. The closure records the observed detection yield:
external differential found the wrong oracle, red-first enforcement caught new
unproven vectors, and systematic re-derivation found no additional
disagreements.

New value-vector cases are now guarded by red-first discrimination metadata in
`run-pine-value-vectors.ts`. The old `pine-value-vectors-coverage-v174.json`
baseline is not a valid grandfather list because it was generated after the
PR-local suite already existed. `pine-value-vector-red-first-exemptions-v1`
records the honest state instead: `0` frozen pre-rule rows, `969/996` explicit
exemptions, and `27/996` cases currently bound by the proof rule. A valid proof
must assert full bar-count output length and include a value-flipping mutation
(`flip-first-value` or `flip-first-non-null-value`) that actually turns the
case red; length-only mutations are not accepted. The exemption list is
closed-ended: the checker computes drift and fails, but does not add rows to
the committed register automatically. New helper-derived cases must
additionally cite a concrete published formula or reference composition; broad
family-level docs are not enough for new helper vectors.

The remaining trace/provider-exact names were reclassified in the member-map
series: exact margin liquidation timing, risk halt/forced-exit timing, provider
feeds, and realtime/session behavior depend on TradingView traces or host data
rather than deterministic local value oracles.

Depth coverage is now measured separately in `pine-value-vector-depth-v42`:
member breadth is complete for locally-verifiable names, optional argument
coverage is 457 of 471 documented optional slots, and strict overload coverage
is 10 of 10 explicit overload rows after the priority-queue input, array, TA,
strategy, visual metadata, color transparency, global history, and historical
tick output replacement vectors.

`pine-value-vectors-v7-gap-coverage-v1` records the vector response to the V7
targeted harvest. It covers 19 real-gap rows with eight root-cause vectors:
five already green and three expected-red. It adds root-cause coverage rather
than member breadth because the relevant official members were already mapped.

`pine-member-property-map-v3` is the corpus-facing output-property lens. It maps
851 of 861 official members to reference-derived properties: numeric ranges,
sign constraints, collection/handle/string shapes, enum constants, tuple
coherence, and side-effect-only output. V3 corrects `str.split` from an invalid
string-domain rule to collection-shape only, so the rule denominator is `992`.
`pine-member-property-map-validation-v14`
applies the executable scalar/tuple subset, explicit scalar proxy checks for
enum/string/color/handle constants, bounded drawing/table/plot payload checks,
and attributed collection checks to known-good vector cases with 1575 evaluated
applications, 892 unique applied rules, and 0 fires. The v3 map deliberately leaves
`math.round` and `ta.kcw` unmapped after validation proved their earlier rules
over-strict.
`pine-member-property-map-shipped-validation-v3` applies the same lens to the
29 shipped Pine studies: 29/29 execute, 91 shipped-study applications fire 0
rules, and combined known-good coverage reaches 897 of 992 property rules.
`pine-member-property-validation-filter-v14` records the executable filter:
mechanical output attribution and constructed single-target cases validate all
reachable local scalar, handle, collection, and locally bounded color rules
available on this branch.
`pine-member-property-unvalidated-rules-v2` breaks down the remaining 95 rules:
49 side-effect outputs with no return value for known-good comparison, 44
trace/provider/host or opaque scalar rules with no known-good output source,
`chart.fg_color` as an expected-red documented-value defect fixed in the runtime
lane, and `ticker.kagi` as branch-stale until the parser-lane two-argument fix
lands here. This is the property-lens ceiling for the current evidence model:
the reachable set is fully validated, so the corpus audit lead bucket will not
empty. Fires from the 897 validated rules are findings; fires from the 93
structural or evidence-bound rules remain leads by design unless new external
evidence or side-effect-specific instrumentation exists.

`PINE_TRACE_REQUIRED_v2.md` removes seven rolling-`na` entries from the
trace-required queue through documented-composition vectors: `ta.iii`, `ta.nvi`,
`ta.obv`, `ta.pvi`, `ta.pvt`, `ta.wad`, and `ta.wvad`. Coverage v111 tests
leading `na`, interior holes with recovery, all-`na`, and denominator-zero
edges where the published expression has a denominator.

Coverage v113 also carries 45 invariant vectors for still trace-required
functions. These do not remove entries from the trace register because they do
not settle seed, hole, or recovery values. They do prove derived safety
properties such as oscillator bounds, band tuple coherence, pivot confirmation
timing, cross-family coherence, monotonic accumulation, tuple arithmetic, and
weighted-average bounds. The former MFI bound failures now pass; the only
remaining expected-red cases are diagnostic known gaps tracked in the section
below, not regressions.

`shipped-pine-study-member-inventory-v2` measures checked-in Pine sources shipped
by Tealchart and apps/web defaults. Those 29 sources reference no members from
the 48 trace/host-required register, but they do reference 10 unsettled TA
missing-value policy members: `ta.crossover`, `ta.crossunder`, `ta.dmi`,
`ta.hma`, `ta.macd`, `ta.rsi`, `ta.sar`, `ta.stoch`, `ta.supertrend`, and
`ta.vwap`. Call-site exposure is colder than the member list: eight of those
members are fed only non-hole chart sources, two can see leading warm-up `na`
through derived RSI/MACD inputs, and zero can see an interior hole in shipped
Pine. This measures checked-in Tealstreet Pine templates only, not user-written
or user-persisted scripts.

`pine-value-vector-corpus-exposure-v1` applies the same static exposure scan to
the 2,000 pinned v5/v6 public corpus scripts. That wider user-written sample is
not cold: 1,135 scripts touch either trace/host-required or unsettled-NA members,
488 touch trace/host-required members, 722 touch unsettled TA policies, and 66
have confirmed mid-series hole exposure into unsettled TA policies. Another 189
unsettled-policy scripts route through UDF/object-state dependencies that the
static scanner cannot classify safely.

`pine-trace-purchase-order-v2` collapses that exposure to the measured trace
purchase order. The first recording should target undocumented TA interior-hole
policies, settling `ta.crossover`, `ta.crossunder`, `ta.cross`, `ta.bb`,
`ta.rsi`, `ta.stoch`, and `ta.vwap` for 66 scripts. The second should target
live `barstate.isnew`/`barstate.isrealtime` ticks for 36 scripts, and the third
should target `timenow` for 35.
This measured order disagrees with `PINE_TRACE_REQUIRED_v1`: rank 10 is the
hottest practical user-script exposure, while rank 1 `request.security` remains
structurally common but is not ranked by the 50-member trace/host scan. The
first acquisition is also the cheapest: one static historical TradingView export
with deliberately holed source series, not a synchronized realtime feed,
rollback trace, broker-emulator trace, alert schedule, or provider capture.
The historical `barstate.islastconfirmedhistory` boundary has been externally
closed by `pine-barstate-lastconfirmedhistory-oracles-v1.md`, so purchase two
no longer buys that behavior.
The paste-ready script is `tradingview-ta-hole-trace-v1.pine`, and
`scripts/import-tradingview-ta-hole-trace.ts` converts TradingView's chart-data
CSV into vector expectation JSON.

## Remaining Expected-Red Cases

- `strategy.calc-on-order-fills-values` — trace-required fill-triggered
  recalculation is not simulated by the local oracle.

## Trace-Undetermined Input Domains

- `color.rgb()` component values: TradingView documents the valid 0-255 RGB
  range, but the audited docs do not state whether dynamic invalid runtime
  inputs reject, clamp, or follow another behavior. Current TealScript clamps
  and surfaces a runtime approximation, so this is not a reference-backed
  expected-red.
- Legacy `bgcolor(transp=...)`: TradingView documents the valid 0-100
  transparency range, but the audited docs do not state the runtime consequence
  for dynamic invalid inputs. Current TealScript compatibility behavior remains
  trace-undetermined, not a known rejection target.
