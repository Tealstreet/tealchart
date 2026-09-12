# TealScript Pine Corpus Briefing v1

Single entry point for corpus evidence. This is a briefing, not a change log.

Corpus acceptance means a script parses, checks, runs, and emits normalized
output. It does not prove the output values match TradingView.

Related entry points:

- Overall parity state and operating rules: `PINE_PARITY_STATE.md`
- Corpus-ranked build targets: `reports/pine-corpus-priority-queue-v1.md`
- Corpus value-check route: `reports/external-pine-consensus-full-v1.md`;
  action filter: `reports/external-pine-consensus-vector-crosscheck-v1.md`
- TradingView-terminal work: `reports/pine-tradingview-terminal-queue-v1.md`
- Rule 6 external-oracle register: `reports/pine-rule6-backward-audit-v8.md`

## Corpora

The committed corpus union contains `2,506` real Pine scripts:

| Corpus | Rows | Shape | Reconstruction manifest |
| --- | ---: | --- | --- |
| v5 | `1,000` | GitHub-sourced public Pine, version-weighted toward v5 | `reports/external-pine-corpus-v5.manifest.json` |
| v6 | `1,000` | GitHub-sourced public Pine, version-weighted toward v6 | `reports/external-pine-corpus-v6.manifest.json` |
| v7 | `456` | Targeted harvest for the historical 75 untouched members | `reports/external-pine-corpus-v7.manifest.json` |
| v7 size recovery | `50` | Real Pine rejected only by the old byte-size filter | `reports/external-pine-corpus-v7-size-recovery.manifest.json` |

All `2,506` manifest rows carry repo URL, path, commit SHA, and normalized
source SHA-256. `reports/pine-corpus-manifest-reconstruction-check-v1.md`
measured at `6f88922ca7` refetched a deterministic `160`-row sample, `40` per
corpus, and matched `160/160` hashes with `0` fetch failures and `0` hash
mismatches. The caches are not committed, but the committed manifests are
sufficient reconstruction manifests for sampled rows.

Cache-dependent generators should refuse when required caches are absent rather
than measuring partial data. `reports/pine-corpus-generator-reproducibility-v1.md`
audited `17` generators at `28221b0a7c`: `5` are repo-clean reducers, `10` need
rebuilt local pinned caches, and `2` are acquisition/replay scripts.
`reports/pine-report-volume-audit-v1.md` measures the repo-health cost of the
report set itself: `packages/tealscript/reports` is `621.24 MiB` apparent size,
with value-vector coverage JSON generations accounting for `486.44 MiB`. No
cleanup has been applied; the report lists retention options for Sam to decide.
`reports/pine-coverage-json-delta-audit-v1.md` then compares adjacent coverage
generations v168 and v169: `0/931` existing cases changed, `3` cases were
added, and the diff touched about `0.218%` of v169. That makes future
latest-full-plus-delta output a format fix, not a deletion decision.

## Current Acceptance

Latest daily-profile acceptance rerun:

| Corpus | Current figure | Measurement |
| --- | ---: | --- |
| v5 | `866/925` achievable output | `reports/external-pine-corpus-merged-head-37a7dc7375-v1.md`, `37a7dc7375` |
| v6 | `776/935` achievable output | Same report, `37a7dc7375` |
| v7 | `307/400` achievable output | Same report, `37a7dc7375` |

Measurement basis: the corpus runner now uses `createStandardCorpusBars()`
(`1600` realistic daily bars) and counts active strategy ledger state as
produced output. Those changes landed at `ba58a58f2d` and `f1bf632436`
respectively. Both are ancestors of every corpus acceptance measurement commit
quoted in this briefing, including `7c08371da1`, `7ee7a2c98b`, `37ca779926`,
`8db55d66ae`, `37a7dc7375`, and `cb0f29f78c`, so these quoted comparisons are
like-for-like with respect to bars and produced-output definition. Do not
compare them to any pre-`ba58a58f2d`/pre-`f1bf632436` corpus figure without
remeasuring or marking it non-comparable.

`reports/external-pine-corpus-merged-head-37a7dc7375-v1.md` is the first full
rerun after integrating the corpus, runtime and parser lanes. Against the
`8db55d66ae` baseline it measures `15` output-to-non-output transitions and `5`
recoveries, for net `-10` achievable output rows. No unattributed regression
remains. The drops are all attributed:
`10` TA `simple` qualifier refusals, `2` declared-v5 untyped `= na` refusals,
`2` `array.percentile_*` percentage type refusals, and `1` `matrix.concat()`
non-mutation/runtime matrix-bounds correction. The recoveries are `2`
switch-arm arrow-continuation parse rows, `1` extrema-bars/default-source output
row, `1` matrix runtime row, and `1` `ticker.kagi(symbol, reversal)` row. The
`request.currency_rate(..., to = ...)` parser fix recovered `0` corpus rows; no
v5/v6/v7 source uses that named argument shape, so this real parser defect has
zero measured corpus exposure. The TA qualifier blast-radius estimate predicted
`6` rows; all `6` materialized and the full rerun exposed `4` more, so
blast-radius samples are lower bounds rather than forecasts.

The preceding `reports/external-pine-corpus-version-rule-settlement-rerun-v1.md` verifies the
`9b55fe5a1d` prediction after the parser lane settled the four pending
version-rule diagnostics: `0` repairs, `0` new refusals, and `0` row outcome
changes across v5/v6/v7. The current source scan still finds `0` rows for v5
generic `input(..., type=input.integer)`, v5 bare global `sma()`, v4
statement-level untyped `= na`, and v3 bool arithmetic under declared versions,
so the zero movement is both a movement result and a construct-absence result.

The preceding `8db55d66ae` batch report measured a net `+1` movement from
`37ca779926`: one v5 declared-v4 legacy bare `pvt` row recovered after
resolver shadow-invariant fixes at `ebac5ce93f`. The parser version-rule batch moved `0` corpus
acceptance rows, with `0` new correct refusals and `0` offsetting repairs in
v6/v7. Chart foreground colour, host-default disclosure, builtin registry
invariants, realtime barstate boundary, array `na`, collection sort enum,
grammar snippets and enum guards also move `0` corpus acceptance rows in this
batch report.

`reports/external-pine-corpus-version-refusal-prediction-v1.md`, measured at
`8528648ef3`, predicts `0` output-count movement when the four pending
version-rule refusals land: v5 generic `input(..., type=input.integer)`, v5
bare global `sma()`, v4 untyped statement-level `= na`, and v3 bool arithmetic
all match `0` currently-producing v5/v6/v7 corpus rows under their declared
versions. Apparent declared-v4 `y=na` hits were named arguments inside
`label.new(...)`, not untyped declarations, and are excluded.

Strategic pattern: legacy-version correctness is real but cold in this corpus.
Every v3/v4/v5 version-correctness acceptance measurement so far has moved
`0` corpus rows, now six-for-six after the settlement rerun: modern `iff()`
refusal under v5/v6 found `0` active calls in
`2,506` scripts (`reports/external-pine-corpus-refusal-gate-v1.md`,
`e7136357a8`); the eight-rule parser version batch moved `0` acceptance rows
(`reports/external-pine-corpus-version-rule-batch-rerun-v1.md`,
`8db55d66ae`); the four pending refusals prediction found `0` source rows
(`reports/external-pine-corpus-version-refusal-prediction-v1.md`,
`8528648ef3`); and the current settlement rerun confirmed `0` repairs,
`0` refusals, and `0` row outcome changes
(`reports/external-pine-corpus-version-rule-settlement-rerun-v1.md`,
`5da61fcb1a`). These fixes are still correct: they make TealScript accept what
TradingView accepts and refuse what TradingView refuses. But in the measured
GitHub-harvested corpora, they have no observable acceptance impact, so they
rank below measured v6/current-surface work when prioritizing by corpus
evidence. Caveat: GitHub corpora underrepresent dormant personal scripts and
users pasting five-year-old v3/v4/v5 code; this is evidence that the legacy
surface is cold in this sample, not proof that it is cold in the world.

The previous report at `37ca779926` measured a net `-7` movement from the
post-TA-rebound baseline at `7ee7a2c98b`: `+2` switch-tail repairs, `-2`
propagated request-expression TA-length refusals, `-1` semantic drawing-type
refusal, `-5` generated-history `max_bars_back` refusals, and `-1` TealScript
regression from shadowed runtime state resolution on declared-v4 legacy bare
`pvt`. The current rerun confirms that regression is now repaired.

Earlier acceptance-changing context is preserved in
`reports/external-pine-corpus-current-error-rerun-v1.md` (`7c08371da1`, net
`-25` from propagated runtime errors and invalid TA length refusal) and
`reports/external-pine-corpus-ta-length-codegen-fix-measurement-20260911.md`
(`7ee7a2c98b`, net `+29` TA-length rebound from `6c66058cf4`).

The cheap regression gate is
`reports/external-pine-corpus-fast-gate-v1.md`: a committed 12-row real-script
fixture selected from v5/v6/v7 for version spread, output families, and surfaces
that moved in corpus audits. Run it with
`yarn workspace @tealstreet/tealscript pine:external-corpus:fast-gate`. It
catches acceptance regressions on that subset only; it is not a replacement for
the full pinned corpus rerun and does not prove output correctness.

The expected-refusal sibling is
`reports/external-pine-corpus-refusal-gate-v1.md`: a committed 6-row fixture
for correct refusals that the acceptance gate cannot contain because they must
not produce output today. Run it with
`yarn workspace @tealstreet/tealscript pine:external-corpus:refusal-gate`. It
asserts the specific refusal, not merely failure, so a row changing to the
wrong diagnostic or silently accepting is red.

## Saturation

Corpus member coverage is saturated for broad GitHub-style harvesting.
`reports/pine-corpus-saturation-v1.md`, measured at `73dddcb5f2`, finds the
v5 + v6 + v7 + size-recovery union reaches `827/861` official members
(`96.05%`). The `34` official members untouched by `2,506` real scripts are all
`currency.*` constants. They are not language features, runtime surfaces, or
trace-required behavior.

V7 did its historical job: `reports/external-pine-corpus-v7.targeted-harvest-v1.md`
at `1d103e1ea6` reached `75/75` members that were untouched before v7. The
`50` size-recovered scripts were real Pine, but
`reports/external-pine-corpus-v7-size-recovery-v1.md` at `3c2c00ac84` found
they add `0` new official members and `0` new construct tags. A fourth broad
GitHub harvest is therefore not a meaningful engine-evidence frontier; only a
deliberate currency-constant harvest would move the member count.

## Actionable Route

For corpus-driven build work, start with
`reports/pine-corpus-priority-queue-v1.md`, measured at `be88f5dc1c`. It is the
actionable synthesis of the three usage axes below, with `10` targets hitting
at least two axes and `0` triple-axis targets. The top exposed targets are
`color.new`, `input`, and drawing/input argument slots.

The component reports remain authoritative measurements, but the queue
supersedes them as a priority order:

| Axis | Finding | Measurement |
| --- | --- | --- |
| Member depth against use | `96` high-use thin members, `49` callable | `reports/pine-corpus-vector-depth-gap-v1.md`, `abc1114cbe` |
| Optional argument-slot use | `197/222` vector-untested slots used by corpus scripts; `75` high-priority slots; `25` never explicitly passed | `reports/pine-corpus-optional-argument-usage-v1.md`, `1b35f646e3` |
| Construct depth against use | `71/76` construct rows exercised; `47` high-use; `20` high-use thin; `4` exercised with no grammar snippet | `reports/pine-corpus-construct-depth-v1.md`, `e55bd8c92b` |

## Measured Low-Return Areas

These are negative results, not missing work.

The `25` optional argument slots never explicitly passed by any corpus script
are: `color:transp`, `input.enum:confirm`, `input.price:display`,
`input.session:confirm`, `input.symbol:active`, `input.symbol:confirm`,
`input.text_area:inline`, `input.timeframe:confirm`,
`matrix.sort:sort_field`, `plotarrow:display`, `plotarrow:editable`,
`plotarrow:force_overlay`, `plotarrow:format`, `plotarrow:offset`,
`plotarrow:precision`, `plotchar:format`, `plotchar:precision`,
`plotshape:format`, `plotshape:precision`,
`request.security_lower_tf:currency`, `strategy.close_all:disable_alert`,
`strategy.close:disable_alert`, `strategy.entry:disable_alert`,
`ta.max:source2`, and `ta.min:source2`
(`reports/pine-corpus-optional-argument-usage-v1.md`, `1b35f646e3`).

The `5` construct rows reached by `0/2506` corpus scripts are
`formatting.method-chain-continuation`, `formatting.triple-quoted-string`,
`functions.recursive-call`, `methods.overload`, and
`variables.assignment-modulo` (`reports/pine-corpus-construct-depth-v1.md`,
`e55bd8c92b`). Direct recursive UDF calls are both untested and unused in the
public corpus.

The `34` untouched official members are all currency constants
(`reports/pine-corpus-saturation-v1.md`, `73dddcb5f2`).

## Invalid Pine

The invalid-Pine row classifications cluster rather than hide a broad
misclassification. `reports/pine-corpus-invalid-clusters-v1.md`, measured at
`f48dfe0e63`, groups `149` invalid rows into `64` shapes. Only `2` shapes clear
the independent-author/repo bar for compile-evidence escalation:

- `request.footprint()` with one argument.
- `matrix.sum()` with zero or one argument.

Same-repo repeats remain watch items, not acceptance evidence.

## Output Properties

The output-property audit found no defects across current producing corpus
rows. This is a closed negative result.

| Detector | Result | Measurement |
| --- | --- | --- |
| Reference-free all-NaN / constant-field scan | Raw candidates existed (`1,230` all-NaN fields, `912` constant-finite fields), but no final failures | `reports/external-pine-corpus-output-reference-free-v2.md`, `7c08371da1` |
| Member-property lens | `658` applied rules, `0` fires | `reports/external-pine-corpus-output-member-properties-v2.md`, `8cf06fa683` |
| Sibling asymmetry reslice | Large lower bounds (`942` all-NaN fields with producing sibling, `598` constants with varying sibling), so the refinement is non-discriminating | `reports/external-pine-corpus-output-asymmetry-reslice-v1.md`, `f7dd0ac665` |

An instrument that fires nothing over `1,936` producing rows is a result: corpus
output still lacks TradingView traces, but these trace-free impossible-output
detectors did not find defects.

## External Consensus Values

`reports/external-pine-consensus-full-v1.md`, measured at `0a5c87fe05`, is the
current corpus-scale value check against external implementations. It compares
all declared v5/v6 rows across v5, v6, v7, and size recovery against PineTS and
Pine-A-Script on the same committed `240`-bar OHLCV fixture plus committed
deterministic syminfo/chart/timeframe context.

Sam's current canon rule is provenance-tagged rather than all-or-nothing:
`external-consensus` means both voters agreed, `pinets-sole` means PineTS alone
ran and is canonical, and `pine-a-script-sole` means Pine-A-Script alone ran and
is canonical. Rows where both voters run and disagree remain no-verdict rows and
are recorded/closed.

The full run measured `2,428` declared v5/v6 rows. It produced `1,677`
canonical rows: `224` external-consensus, `1,338` pinets-sole, and `115`
pine-a-script-sole. TealScript differed on `867` canonical rows, grouped into
`27` routed cause buckets. That `867` is not a defect list; use
`reports/external-pine-consensus-vector-crosscheck-v1.md`, measured at
`3759316856`, as the action filter over it. The largest raw buckets are:

- `warmup-na-vs-finite`: `237` rows.
- `tealscript-host-request-security-datafeed`: `216` rows.
- `later-na-vs-finite`: `68` rows.
- `output-call-count-shape-mismatch`: `59` rows.
- `warmup-finite-seed-value`: `55` rows.
- `tealscript-semantic-other-refusal`: `33` rows.
- `finite-value-mismatch`: `30` rows after TealScript failures are split out.

The rerun also fixed two instrument ceilings. Supplying syminfo/chart/timeframe
context removed the previous PineTS `tickerid`/`mintick`/`ticker` starvation
class; feeding the `scale.*` enum removed the related `scale is not defined`
bucket. Output-family-aware comparison removed Pine-A-Script visual-family
under-capture from the vote in `308` rows, converting those rows to PineTS canon
where PineTS exposes the full static output-call surface. `56` shape rows remain
non-comparable because PineTS itself has output capture/key-collapse artifacts.

The voters-differ rate is now `239/2428` (`9.84%`) of all rows and `12.47%` of
rows where a value comparison ran. Its class split is `121` warmup/seed, `62`
later-value, and `56` shape rows. Per Sam's rule, unresolved voter disagreement
is recorded and closed rather than escalated.

The JS/TS coercion audit found one contaminated consensus class:
`array.percentile_*("50")`. The `ad6eaa95fe` runtime coercion was reverted;
codex-d8rtlo owns the semantic compile-time refusal replacement. The full
report tags `3` percentile string-percentage rows as `coercionSuspect` and
excludes the `2` rows with actual value differences from TealScript defect
groups. The later live-reference audit
`reports/ta-extremebars-default-source-regression-v1.md` supersedes that
report's source-omitted highestbars conclusion: one-argument `ta.highestbars`
uses `high` and one-argument `ta.lowestbars` uses `low`; the external
two-JS-engine all-`na` agreement was contamination, not Pine semantics. The
remaining no-contamination findings for hline, syminfo/context, scale, and
family-aware comparison still stand.

PineTS is also not safe as blanket sole canon. `reports/external-pine-consensus-pinets-grammar-precedence-audit-v1.md`
at `dc2fbac78e` tested PineTS against committed language value vectors and
grammar snippets. PineTS passed the explicit precedence probes, including
`a == b > c`, but failed `17` documented `language.*` value vectors and could
not run `12` more. The contaminated families are drawing receiver/value
methods, builtin-name shadowing, history on expression/function/method results,
block-valued loop expressions, and switch arms ending in a nested `if`.
Headline taint: `446/1338` PineTS-sole canon rows and `319/716` PineTS-sole
differing rows overlap those documented-wrong families. The positive trust map
at `d92e451c9b` found `0` fully allowlisted PineTS-sole rows. The top-ten
family probe at `abbeda9f9d` then proved PineTS wrong against documented
`plot`, `na`, and `nz` value-vector probes, striking `805` PineTS-sole rows in
the full run. PineTS-sole canon counts must carry this caveat.

The vector cross-check resolves the apparent contradiction between the `867`
raw consensus differences and the independently derived value-vector suite
(`989` cases, `988` green, with the single red expected trace-required). It
cross-checks every raw cause bucket against vector evidence, documented
refusals, host/trace boundaries, semantic-surface ownership, and known
output-capture instrument artifacts. The `867` rows reduce to `119` automatic
value triage candidates plus `25` runtime-refusal rows that need source reads.
All `119` automatic value candidates are sole-voter rows (`112` pinets-sole,
`7` pine-a-script-sole); `0` two-voter external-consensus rows survive the
automatic filter. Where the evidence is strongest — two independent external
engines agreeing against TealScript — TealScript matched every value row across
the `2,428` scripts. `reports/external-pine-consensus-survivor-triage-v1.md`,
measured at `77182ce65e0`, classifies the `25` runtime-refusal source reads:
`21` correct invalid-Pine refusals, `2` host/request-context boundaries, and
`2` real runtime/codegen acceptance candidates. It then applies the documented
PineTS taint strike from the grammar/precedence audit: `52/119` automatic value
candidates are struck, leaving `67` sole-voter rows for triage (`65`
pinets-sole, `2` pine-a-script-sole).
`reports/external-pine-consensus-pinets-top10-strike-rerank-v1.md`, measured at
`31a4d4eb61`, applies codex-jk7l2w's `805`-row top-ten PineTS strike to those
survivors: all `65` PineTS-sole rows are struck, leaving only `2`
Pine-A-Script-sole warmup rows and still `0` two-voter external-consensus
survivors. `reports/external-pine-consensus-pinetstaint-followup-v1.md`,
measured at `83fcdeecdb`, follows the first strike through the two
strongest-looking held classes: the remaining TealScript-null rows are
first-valid/warmup-boundary disagreements, not mid-series buffer exhaustion.
`v5 0051` resolves to a
documented `ta.highestbars`/`ta.lowestbars` sign-convention defect: existing
vectors had encoded positive bars-ago offsets, while PineCoders and the
official TradingView `ta` library Aroon source require negative-or-zero offsets.
The runtime, official-library wrapper, and value-vector expectations now use
the documented sign; provenance is `documented`, not `external-consensus`. This
was a two-bugs-cancelling vector failure: the Aroon vector passed because both
the expected-value helper and TealScript's Aroon wrapper compensated with
`len - offset`. The pass-rate figure remains useful, but the extrema-bars/Aroon
family is the counterexample proving a passing vector can still carry a wrong
oracle. That family is now corrected. The held sets are also re-scored:
`9/24` material finite-value mismatches and `31/55` warmup/seeding rows are
struck by PineTS documented-family contamination. The cross-check report parks
`123` semantic-surface rows for the
parser/semantic lane; codex-d8rtlo has separately closed the semantic
argument-TYPE surface at `0` holes and is measuring qualifier enforcement, so
the corpus lane should not duplicate that work.

The same report remeasures hline payload completeness after the hline value fix.
Before the fix, `336` accepted hline-bearing rows carried `811` accepted hline
calls but visible hline plots had empty value arrays; only `1` hline-only row
could have inflated headline acceptance. Current audit finds `730/730` visible
hline plots complete across executing rows and `0` incomplete. The `35` rows
that fail before the hline payload check are not an hline regression: the
report's detached pre-fix check shows `35/35` already failed at `75f4f9708e^`.
The hline fix also exposed two stale value-vector expectations
(`visual.plot-hline-fill-metadata-values`, `visual.constant-identity-values`)
that still expected `[]` hline outputs; those expectations now use per-bar
constant hline values.

## Harvest Filter

The v7 rejection filter was mostly sound, with one principled flaw.
`reports/external-pine-corpus-v7.rejection-audit-v1.md` at `d9ec848a5b`
replayed the harvest filter and found `50` suspect size-threshold rejections:
`26` genuine Pine files below the old `120` byte floor and `24` above the old
`180,000` byte ceiling. It found no suspect version-header, encoding, literal
elision, commit lookup, or raw-fetch bucket.

`reports/external-pine-corpus-v7-size-recovery-v1.md` at `3c2c00ac84` recovered
all `50`; `27` produced output, and the recovery added `0` official members and
`0` construct tags. The byte thresholds were still wrong because they discarded
real Pine by heuristic, even though the discarded scripts added no unique
coverage in this harvest.

## Rebuild Boundary

The committed reports are reproducible at two levels:

- Pure synthesis reducers rerun from committed reports/manifests and fail on
  contract drift.
- Source-scanning and rerun/property generators require complete local
  `.cache/tealscript/...` source or baseline artifacts rebuilt from manifests.

Use `reports/pine-corpus-generator-reproducibility-v1.md` (`28221b0a7c`) for
the generator class list, and
`reports/pine-corpus-manifest-reconstruction-check-v1.md` (`6f88922ca7`) for
the pointer-layer reconstruction check. A clean checkout without rebuilt caches
should fail loudly on the `10` cache-dependent generators; it should not produce
a fresh-looking number from a smaller corpus.

## Remaining Work

There is little proactive corpus-lane work left. The high-value corpus work is
now reactive or conditional:

1. Re-measure corpus acceptance only when behavior changes land or a corpus gate
   goes red. Run the fast acceptance/refusal gates first, then do a full pinned
   rerun only for triggered changes, with refusals separated from repairs and
   every delta attributed to a named commit.
2. Maintain the corpus gates, manifests, and refusal-on-missing-cache generator
   contracts. This is guardrail work, not a new measurement frontier.
3. If external value differential work resumes, run only allowlisted families or
   newly trusted voters. PineTS-sole blanket canon is struck; its value now is
   as a differential signal that can expose wrong local oracles, not as broad
   authority by itself.
4. Use `reports/pine-corpus-priority-queue-v1.md` to guide parser/vector work in
   other lanes. The corpus lane should not re-measure the same member, argument,
   and construct axes unless a new evidence source appears.

Measured low-return work should stay closed unless new evidence changes the
premise: a fourth broad GitHub harvest (`0` meaningful non-currency member
frontier left), more broad helper re-derivation (`33/92` highest-risk rows,
`0` disagreements, `59` lower-risk rows preserved in
`reports/pine-value-vector-helper-backfill-closure-v1.md`), output-property
rescans absent a new property lens, and full corpus reruns without a behavior
change trigger.
