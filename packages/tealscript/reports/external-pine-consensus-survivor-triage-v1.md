# External Pine Consensus Survivor Triage v1

Measured commit: `77182ce65e036932bda7c1699468e69983a6ad37`
Generated: 2026-09-12T05:01:41.668Z

## Headline

This report starts where `external-pine-consensus-vector-crosscheck-v1.md` stopped. It classifies the `25` runtime-refusal rows from source, then filters and clusters the `119` automatic value candidates. It does not route the `123` semantic-surface rows; those are parked for the parser/semantic lane.

The strongest tier remains empty: `867 -> 119 -> 0 corroborated`. All `119` automatic value candidates are sole-voter rows (`112` pinets-sole, `7` pine-a-script-sole); `0` are two-voter external-consensus rows.

PineTS grammar/value-vector trust audit `external-pine-consensus-pinets-grammar-precedence-audit-v1.md` at `dc2fbac78e` proves PineTS is unsafe as blanket sole canon for named documented families. Strike result: `52` / `119` automatic value candidates struck; `67` remain for triage. This is documented-oracle evidence outranking a sole external vote, the same rule that killed the percentile string-coercion row.

Headline canon taint: `446` / `1338` PineTS-sole canon rows and `319` / `716` PineTS-sole differing rows overlap PineTS-wrong documented families. Any PineTS-sole canon figure must carry that caveat until the positive trust map lands.

## Runtime Refusal Rows

| Classification | Rows |
|---|---:|
| correct-refusal-invalid-pine | 21 |
| correct-refusal-host-or-request-context | 2 |
| real-tealscript-gap | 2 |

Two rows are real TealScript runtime/codegen acceptance candidates; the other `23` are correct refusals or host/request-context boundaries where loose external engines ran invalid or unserviceable source.

| Row | Classification | Provenance | Evidence |
|---|---|---|---|
| `v5 0902` | correct-refusal-invalid-pine | pinets-sole | Line 34 calls empty_pop.pop() on a freshly empty array. Pine runtime errors on pop() from an empty array; PineTS treats it as na. |
| `v5 0927` | correct-refusal-invalid-pine | pine-a-script-sole | Lines 3-4 are an import-negative fixture: import notlib as n, with the source comment stating the imported script has no library() declaration. |
| `v5 0945` | correct-refusal-invalid-pine | pinets-sole | Line 82 passes math.round(y * tc) as a table row. y depends on early-bar TA output and is na, so the row coordinate becomes NaN. |
| `v5 0984` | correct-refusal-host-or-request-context | pinets-sole | Line 80 calls request.security_lower_tf(..., tf, ...), and tf defaults to an empty timeframe on the daily chart fixture. That is not lower than the chart timeframe. |
| `v6 0168` | correct-refusal-invalid-pine | pinets-sole | Line 5 calls matrix.copy(values).pow(-1). Matrix powers must be non-negative integers. |
| `v6 0266` | correct-refusal-host-or-request-context | pinets-sole | Same LuxAlgo daily lower-timeframe source as v5 0984: request.security_lower_tf uses the default empty timeframe against the daily chart fixture. |
| `v6 0317` | correct-refusal-invalid-pine | pinets-sole | Lines 3-4 create a 2x1 table and then write column 2, row 0; valid columns are 0 and 1 only. |
| `v6 0444` | correct-refusal-invalid-pine | external-consensus | Lines 3-4 create a 2x1 table and then write row 1; valid row is 0 only. |
| `v6 0513` | correct-refusal-invalid-pine | external-consensus | Lines 3-4 create a 2x1 table and merge through column 2; valid columns are 0 and 1 only. |
| `v6 0556` | correct-refusal-invalid-pine | pinets-sole | Lines 39-41 are a script-authored runtime.error when the supply/demand timeframe is below the chart timeframe; the deterministic chart context trips that guard. |
| `v6 0670` | correct-refusal-invalid-pine | external-consensus | Lines 3-4 create array.new_int(100000) and then array.unshift another element, exceeding Pine array size limits. |
| `v6 0681` | correct-refusal-invalid-pine | pinets-sole | Lines 3-4 create a 2x1 table and then set row 1; valid row is 0 only. |
| `v6 0910` | correct-refusal-invalid-pine | pine-a-script-sole | Line 67 uses JavaScript-style || in a Pine expression. Pine uses word operators such as or. |
| `v7 0002` | correct-refusal-invalid-pine | external-consensus | Lines 7 and 10 add a length-3 array as a column to a 1-row matrix; the column length does not match the row count. |
| `v7 0004` | correct-refusal-invalid-pine | external-consensus | Lines 6 and 10 add a length-3 array as a column to a 1-row matrix; the column length does not match the row count. |
| `v7 0149` | correct-refusal-invalid-pine | pine-a-script-sole | Lines 4-5 call matrix.eigenvalues() on a 2x3 matrix. Eigenvalues require a square matrix. |
| `v7 0153` | correct-refusal-invalid-pine | pinets-sole | Lines 6-10 mutate float_rows to 2x3, then add a length-2 eigenvalue row; row length does not match the column count. |
| `v7 0159` | real-tealscript-gap | pine-a-script-sole | The source is a declared-v6 coverage fixture whose matrix.det target is a 2x2 matrix at line 12. TealScript later reports determinant on a 4x2 matrix; source read does not justify the refusal. Owner: runtime/codegen. |
| `v7 0162` | correct-refusal-invalid-pine | pine-a-script-sole | Lines 4-5 call matrix.eigenvectors() on a 2x3 matrix. Eigenvectors require a square matrix. |
| `v7 0192` | correct-refusal-invalid-pine | external-consensus | Lines 4-5 remove column 1 from a 1x1 matrix; valid column is 0 only. |
| `v7 0193` | correct-refusal-invalid-pine | external-consensus | Lines 4-5 remove column int(na) from a 1x1 matrix; NaN is not a valid column index. |
| `v7 0213` | correct-refusal-invalid-pine | external-consensus | Lines 4-5 swap column 1 in a 1x1 matrix; valid column is 0 only. |
| `v7 0214` | correct-refusal-invalid-pine | external-consensus | Lines 4-5 swap column int(na) in a 1x1 matrix; NaN is not a valid column index. |
| `v7-size-recovery 0009` | real-tealscript-gap | pine-a-script-sole | Large declared-v6 Pine-A-Script source uses ordinary receiver methods with receiver parameter named this at lines 142, 256, and 279. TealScript fails during generated-JS compilation, not with a Pine-facing source diagnostic. Owner: runtime/codegen. |
| `v7-size-recovery 0022` | correct-refusal-invalid-pine | pinets-sole | Lines 21 and 428-505 declare max_bars_back=0 and then repeatedly read label handles with [1]. The explicit zero history budget cannot satisfy those history reads. |

## Candidate Clusters

These are triage candidates, not fixes. Rows in PineTS-wrong documented families are struck, not deferred. Before any remaining cluster lands, the full value-vector suite is a hard gate: a proposed PineTS-sole or Pine-A-Script-sole convention that reds an existing documented or hand-derived vector is rejected as external-engine behavior, not adopted as TealScript behavior.

### PineTS Contamination Strike

| Family | Struck survivor rows | Reason |
|---|---:|---|
| history-on-expression-or-call-result | 1 | PineTS wrong on expression/function/method/array result history vectors. |
| block-valued-loop-expression | 2 | PineTS wrong on for-loop return expression vector. |
| builtin-name-shadowing | 30 | PineTS wrong on local values shadowing builtins such as close/high with current/history reads. |
| drawing-receiver-method-value | 19 | PineTS wrong on drawing receiver method named-argument value vector. |

| Row | Cause | Provenance | PineTS contamination family | First difference |
|---|---|---|---|---|
| `v5 0134` | later-na-vs-finite | pinets-sole | drawing-receiver-method-value | plot[0][126] 96.7464766741 != null |
| `v5 0386` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][0] 0.0625 != 0 |
| `v5 0387` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][1] 8159.4711958299 != 0 |
| `v5 0388` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][1] 0.0011777475 != 0 |
| `v5 0390` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][0] 45.6875 != 0.004464285714285615 |
| `v5 0391` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][1] 6.807520609199855 != 0 |
| `v5 0392` | finite-value-mismatch | pinets-sole | builtin-name-shadowing | plot[0][17] 92.0158249304 != 0 |
| `v5 0395` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][1] -2.8666916129 != 0 |
| `v5 0398` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][1] 1 != 2 |
| `v5 0400` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][0] 10234 != 0 |
| `v5 0402` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][0] 818.72 != 0 |
| `v5 0404` | finite-value-mismatch | pinets-sole | builtin-name-shadowing | plot[0][5] 2.0733950310921694 != 0 |
| `v5 0405` | later-na-vs-finite | pinets-sole | builtin-name-shadowing | plot[0][12] 3105 != null |
| `v5 0406` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][0] 639.625 != 0 |
| `v5 0409` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][1] 20241.9260795368 != 0 |
| `v5 0492` | finite-value-mismatch | pinets-sole | drawing-receiver-method-value | plot[4][43] 100 != 87.98436563983076 |
| `v5 0541` | later-na-vs-finite | pinets-sole | drawing-receiver-method-value | plot[0][99] 40.622223085 != null |
| `v5 0548` | later-na-vs-finite | pinets-sole | drawing-receiver-method-value | plot[1][14] null != 100 |
| `v5 0590` | finite-value-mismatch | pinets-sole | drawing-receiver-method-value | plot[0][14] 0 != -20 |
| `v5 0595` | later-na-vs-finite | pinets-sole | drawing-receiver-method-value | plot[0][34] null != 21.658970857706326 |
| `v5 0917` | finite-value-mismatch | pinets-sole | drawing-receiver-method-value | plot[0][89] -4.967764633680499 != -0.645593631710458 |
| `v5 0968` | finite-value-mismatch | pinets-sole | drawing-receiver-method-value | plot[0][199] 142.9018688289 != 112.46391767816598 |
| `v5 0970` | finite-value-mismatch | pinets-sole | drawing-receiver-method-value | plot[0][199] 142.9018688289 != 112.46391767816598 |
| `v6 0001` | finite-value-mismatch | pinets-sole | builtin-name-shadowing | plot[0][5] 2.0733950310921694 != 0 |
| `v6 0002` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][0] 818.72 != 0 |
| `v6 0007` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][1] 8159.4711958299 != 0 |
| `v6 0008` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][1] 6.807520609199855 != 0 |
| `v6 0009` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][0] 0.0625 != 0 |
| `v6 0010` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][1] -2.8666916129 != 0 |
| `v6 0011` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][1] 1 != 2 |
| `v6 0014` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][1] 20241.9260795368 != 0 |
| `v6 0015` | finite-value-mismatch | pinets-sole | builtin-name-shadowing | plot[0][17] 92.0158249304 != 0 |
| `v6 0018` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][0] 639.625 != 0.06249999999999861 |
| `v6 0019` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][1] 0.0011777475 != 0 |
| `v6 0022` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][0] 10234 != 0 |
| `v6 0051` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][0] 639.625 != 0 |
| `v6 0056` | later-na-vs-finite | pinets-sole | builtin-name-shadowing | plot[0][12] 3105 != null |
| `v6 0119` | warmup-finite-seed-value | pinets-sole | builtin-name-shadowing | plot[0][1] 0.0011777475 != 0 |
| `v6 0133` | later-na-vs-finite | pinets-sole | builtin-name-shadowing | plot[0][12] 3105 != null |
| `v6 0246` | later-na-vs-finite | pinets-sole | drawing-receiver-method-value | plot[3][30] null != 114.02580407367421 |
| `v6 0435` | warmup-finite-seed-value | pine-a-script-sole | drawing-receiver-method-value | plot[0][0] 0 != 2 |
| `v6 0666` | warmup-na-vs-finite | pinets-sole | drawing-receiver-method-value | plot[0][0] 0 != null |
| `v6 0669` | warmup-finite-seed-value | pine-a-script-sole | drawing-receiver-method-value | plot[0][0] 0 != 2 |
| `v6 0795` | later-na-vs-finite | pine-a-script-sole | history-on-expression-or-call-result | plot[0][46] null != 0.41694356534135074 |
| `v6 0850` | later-na-vs-finite | pinets-sole | drawing-receiver-method-value | plot[1][99] 124.5858202456 != null |
| `v6 0979` | later-na-vs-finite | pinets-sole | drawing-receiver-method-value | plot[5][20] 130.5190184976 != null |
| `v7 0007` | warmup-na-vs-finite | pinets-sole | block-valued-loop-expression | plot[0][0] 101.26 != null |
| `v7 0053` | later-na-vs-finite | pinets-sole | drawing-receiver-method-value | plot[0][20] null != 82.02616834606701 |
| `v7 0077` | warmup-finite-seed-value | pine-a-script-sole | drawing-receiver-method-value | plot[0][0] 0 != 22 |
| `v7 0087` | warmup-finite-seed-value | pinets-sole | drawing-receiver-method-value | plot[0][0] 600.6400000000001 != 1704067200600.64 |
| `v7 0113` | warmup-na-vs-finite | pine-a-script-sole | drawing-receiver-method-value | plot[0][0] null != 0 |
| `v7 0152` | warmup-na-vs-finite | pinets-sole | block-valued-loop-expression | plot[0][0] 101.26 != null |

### By Cause

| Cluster | Rows | Provenance | Examples |
|---|---:|---|---|
| later-na-vs-finite | 22 | pinets-sole:22 | `v5 0094` plot[0][2] null != 101.74095003603577<br>`v5 0250` plot[0][10] 110.5890140377 != null<br>`v5 0586` plot[3][27] null != 0<br>`v5 0600` plot[0][19] null != 77.39061538813542<br>`v5 0718` plot[0][15] 133.7801297163 != null<br>`v5 0723` plot[0][9] null != 84.72769338393734<br>`v5 0751` plot[0][13] 100 != null<br>`v5 0899` plot[0][29] null != 138.81211482203682 |
| finite-value-mismatch | 21 | pinets-sole:21 | `v5 0038` plot[0][2] 1.7864532244 != 1.8494658745316896<br>`v5 0039` plot[0][2] -0.7421934105 != -1.7991557943699823<br>`v5 0040` plot[0][2] 0.976836036 != 0.9614222656168421<br>`v5 0050` plot[0][24] 72 != 128<br>`v5 0051` plot[0][24] 68 != -68<br>`v5 0056` plot[0][28] 1 != 0<br>`v5 0120` plot[0][18] 134.9002429387 != 134.89970006791654<br>`v5 0262` plot[0][11] 2.3637462480162545 != 2.363739249296344 |
| warmup-finite-seed-value | 15 | pinets-sole:15 | `v5 0037` plot[0][1] 15 != 26.55<br>`v5 0287` plot[0][1] 102.0194444526 != 101.63972222627874<br>`v6 0510` plot[8][0] 2530 != 3025<br>`v7 0034` plot[0][0] 0 != 1<br>`v7 0038` plot[21][0] -1 != 1<br>`v7 0160` plot[0][0] 1 != 0<br>`v7 0161` plot[0][0] 1 != 0.7071067811865475<br>`v7 0170` plot[6][0] 0 != 1 |
| warmup-na-vs-finite | 9 | pinets-sole:7, pine-a-script-sole:2 | `v6 0521` plot[0][0] null != 102.26<br>`v7 0182` plot[0][0] null != 0.0016459279741918493<br>`v7 0183` plot[5][0] null != 0.04000000000000001<br>`v7 0225` plot[0][0] 0 != null<br>`v7 0277` plot[0][0] null != 0<br>`v7 0278` plot[0][0] null != 0<br>`v7 0319` plot[0][0] null != 100000<br>`v7 0324` plot[1][0] null != 0 |

After the PineTS contamination strike, the top three cause clusters carry `58/67` rows. This is a small set of convention decisions, not independent row defects.

### Held Sets Re-Scored Against PineTS Contamination

| Held set | Rows | Struck by PineTS documented-family audit | Remaining |
|---|---:|---:|---:|
| material finite-value mismatches | 24 | 9 | 15 |
| warmup / seeding | 55 | 31 | 24 |
| combined held set | 79 | 40 | 39 |

### Cluster 2 Direction Split: later-na-vs-finite

`firstDifference` stores the canonical external value first and the TealScript value second. The direction split is therefore external-left vs TealScript-right. Counts below are after striking PineTS-contaminated rows; the original unfiltered split is retained in JSON under `candidateClusterSplits.originalLaterNaVsFinite`.

| Direction | Rows | Deep rows (bar >= 10) | Bar indices | Examples |
|---|---:|---:|---|---|
| TealScript null, external finite | 12 | 11 | 4, 10, 13, 13, 13, 13, 13, 13, 15, 38, 47, 70 | `v5 0250` plot[0][10] 110.5890140377 != null<br>`v5 0718` plot[0][15] 133.7801297163 != null<br>`v5 0751` plot[0][13] 100 != null<br>`v6 0144` plot[0][13] 100 != null<br>`v6 0215` plot[0][13] 7.14285714 != null<br>`v6 0411` plot[0][13] 100 != null<br>`v6 0416` plot[0][13] 100 != null<br>`v6 0533` plot[0][13] 100 != null<br>`v6 0630` plot[0][70] 135.3758808211 != null<br>`v6 0891` plot[0][4] 106.5216974434 != null<br>`v7 0295` plot[0][38] 102.2180975053 != null<br>`v7 0329` plot[0][47] 3416256000312.276 != null |
| External null, TealScript finite | 10 | 7 | 2, 2, 9, 14, 14, 19, 27, 29, 100, 157 | `v5 0094` plot[0][2] null != 101.74095003603577<br>`v5 0586` plot[3][27] null != 0<br>`v5 0600` plot[0][19] null != 77.39061538813542<br>`v5 0723` plot[0][9] null != 84.72769338393734<br>`v5 0899` plot[0][29] null != 138.81211482203682<br>`v6 0109` plot[0][2] null != 101.74095003603577<br>`v6 0244` plot[4][14] null != 100<br>`v6 0467` plot[0][14] null != 50<br>`v6 0715` plot[0][157] null != 110.81423144736519<br>`v6 0841` plot[5][100] null != -27.06756667208977 |

The original TealScript-null/external-finite direction had `19` rows, `18` deep. The PineTS documented-family strike removes `7`, leaving `12` TealScript-null rows, `11` deep. The remaining TealScript-null direction is the higher-priority diagnosis target because it can indicate output/history exhaustion after a script has already produced values. The opposite direction is weaker evidence because the sole external voter may have stopped producing.

### Cluster 3 Magnitude Split: finite-value-mismatch

Method: precision-like means absDiff <= 0.001 or relativeDiff <= 0.0001, excluding sign flips.

| Split | Rows | Examples |
|---|---:|---|
| precision / accumulation-order sized | 5 | `v5 0120` plot[0][18] 134.9002429387 != 134.89970006791654 (abs=0.0005428707834482793, rel=0.000004024238738361392)<br>`v5 0262` plot[0][11] 2.3637462480162545 != 2.363739249296344 (abs=0.0000069987199107224285, rel=0.000002960859236305936)<br>`v5 0266` plot[0][3] -1.293986703 != -1.2939677698392722 (abs=0.00001893316072787421, rel=0.000014631650142910478)<br>`v6 0028` plot[0][18] 134.9002429387 != 134.89970006791654 (abs=0.0005428707834482793, rel=0.000004024238738361392)<br>`v6 0237` plot[0][33] 4.761981940326948 != 4.761969644014784 (abs=0.000012296312164039591, rel=0.000002582183703786863) |
| material value mismatch | 15 | `v5 0038` plot[0][2] 1.7864532244 != 1.8494658745316896 (abs=0.06301265013168966, rel=0.03407072874358676)<br>`v5 0039` plot[0][2] -0.7421934105 != -1.7991557943699823 (abs=1.0569623838699824, rel=0.5874768528537037)<br>`v5 0040` plot[0][2] 0.976836036 != 0.9614222656168421 (abs=0.015413770383157943, rel=0.015413770383157943)<br>`v5 0050` plot[0][24] 72 != 128 (abs=56, rel=0.4375)<br>`v5 0056` plot[0][28] 1 != 0 (abs=1, rel=1)<br>`v5 0482` plot[0][106] 123.36184923300341 != 125.64928292241387 (abs=2.287433689410463, rel=0.01820490842612219)<br>`v5 0561` plot[3][199] -0.2468325276055051 != 0 (abs=0.2468325276055051, rel=0.2468325276055051)<br>`v5 0580` plot[0][16] 1 != 0.8 (abs=0.19999999999999996, rel=0.19999999999999996)<br>`v5 0594` plot[5][119] -41.4556621346 != -38.623179775886044 (abs=2.8324823587139534, rel=0.06832558480232037)<br>`v5 0857` plot[5][14] 48.5301084415 != 50.08063246314071 (abs=1.5505240216407117, rel=0.030960551921581574)<br>`v5 0951` plot[1][3] 102.0868708721 != 104.0218202964249 (abs=1.9349494243249126, rel=0.018601380160537473)<br>`v6 0140` plot[1][200] 14.1195587546 != 14.283807722813147 (abs=0.1642489682131476, rel=0.011498962419580885) |
| sign flip | 1 | `v5 0051` plot[0][24] 68 != -68 (abs=136, rel=2) |

Decimal-place check: canonical external max decimal places = 16; TealScript max decimal places = 16; canonical values at <=10 decimals = 17/21; TealScript values at <=10 decimals = 7/21. The stored examples do not support a PineTS-is-truncated-to-10dp claim; many canonical external values carry more than 10 decimal places. Several TealScript values are rounded to 10 decimals, so precision-looking rows need source/function triage before being called defects.

### By Cause And Source Family

| Cluster | Rows | Provenance | Examples |
|---|---:|---|---|
| warmup-finite-seed-value \| pine-compat-runtime fixtures | 13 | pinets-sole:13 | `v6 0510` plot[8][0] 2530 != 3025<br>`v7 0034` plot[0][0] 0 != 1<br>`v7 0038` plot[21][0] -1 != 1<br>`v7 0160` plot[0][0] 1 != 0<br>`v7 0161` plot[0][0] 1 != 0.7071067811865475<br>`v7 0170` plot[6][0] 0 != 1<br>`v7 0174` plot[2][0] 0 != 1<br>`v7 0176` plot[5][0] 0 != 1 |
| finite-value-mismatch \| mihakralj-pinescript | 9 | pinets-sole:9 | `v5 0038` plot[0][2] 1.7864532244 != 1.8494658745316896<br>`v5 0039` plot[0][2] -0.7421934105 != -1.7991557943699823<br>`v5 0040` plot[0][2] 0.976836036 != 0.9614222656168421<br>`v5 0050` plot[0][24] 72 != 128<br>`v5 0051` plot[0][24] 68 != -68<br>`v5 0056` plot[0][28] 1 != 0<br>`v5 0120` plot[0][18] 134.9002429387 != 134.89970006791654<br>`v5 0262` plot[0][11] 2.3637462480162545 != 2.363739249296344 |
| warmup-na-vs-finite \| pine-compat-runtime fixtures | 8 | pinets-sole:7, pine-a-script-sole:1 | `v6 0521` plot[0][0] null != 102.26<br>`v7 0182` plot[0][0] null != 0.0016459279741918493<br>`v7 0183` plot[5][0] null != 0.04000000000000001<br>`v7 0277` plot[0][0] null != 0<br>`v7 0278` plot[0][0] null != 0<br>`v7 0319` plot[0][0] null != 100000<br>`v7 0324` plot[1][0] null != 0<br>`v7 0325` plot[1][0] null != 0 |
| finite-value-mismatch \| casoon-pine-scripts | 4 | pinets-sole:4 | `v5 0482` plot[0][106] 123.36184923300341 != 125.64928292241387<br>`v5 0561` plot[3][199] -0.2468325276055051 != 0<br>`v5 0580` plot[0][16] 1 != 0.8<br>`v5 0594` plot[5][119] -41.4556621346 != -38.623179775886044 |
| finite-value-mismatch \| pine-compat-runtime fixtures | 2 | pinets-sole:2 | `v7 0308` plot[0][2] 2 != 0<br>`v7 0315` plot[0][2] -2 != 0 |
| finite-value-mismatch \| regalouisei-collect-tradingview | 2 | pinets-sole:2 | `v5 0857` plot[5][14] 48.5301084415 != 50.08063246314071<br>`v6 0474` plot[0][21] 0.7995444211 != 0.582873755042779 |
| later-na-vs-finite \| casoon-pine-scripts | 2 | pinets-sole:2 | `v5 0586` plot[3][27] null != 0<br>`v5 0600` plot[0][19] null != 77.39061538813542 |
| later-na-vs-finite \| mihakralj-pinescript | 2 | pinets-sole:2 | `v5 0094` plot[0][2] null != 101.74095003603577<br>`v5 0250` plot[0][10] 110.5890140377 != null |
| later-na-vs-finite \| mihakralj-QuanTAlib | 2 | pinets-sole:2 | `v5 0718` plot[0][15] 133.7801297163 != null<br>`v6 0109` plot[0][2] null != 101.74095003603577 |
| later-na-vs-finite \| regalouisei-collect-tradingview | 2 | pinets-sole:2 | `v6 0144` plot[0][13] 100 != null<br>`v6 0467` plot[0][14] null != 50 |
| warmup-finite-seed-value \| mihakralj-pinescript | 2 | pinets-sole:2 | `v5 0037` plot[0][1] 15 != 26.55<br>`v5 0287` plot[0][1] 102.0194444526 != 101.63972222627874 |
| finite-value-mismatch \| ArcFosterSystems-trading-indicator-stack | 1 | pinets-sole:1 | `v5 0951` plot[1][3] 102.0868708721 != 104.0218202964249 |
| finite-value-mismatch \| elijahbrown9-AscendAi | 1 | pinets-sole:1 | `v6 0237` plot[0][33] 4.761981940326948 != 4.761969644014784 |
| finite-value-mismatch \| mihakralj-QuanTAlib | 1 | pinets-sole:1 | `v6 0028` plot[0][18] 134.9002429387 != 134.89970006791654 |
| finite-value-mismatch \| SKBv0-Market-Structure-Indicators | 1 | pinets-sole:1 | `v6 0140` plot[1][200] 14.1195587546 != 14.283807722813147 |
| later-na-vs-finite \| avatar-lavventura-trade_bot | 1 | pinets-sole:1 | `v6 0841` plot[5][100] null != -27.06756667208977 |
| later-na-vs-finite \| benso87-Private-Pine-Scripts | 1 | pinets-sole:1 | `v6 0215` plot[0][13] 7.14285714 != null |
| later-na-vs-finite \| btcjon-pine | 1 | pinets-sole:1 | `v6 0411` plot[0][13] 100 != null |
| later-na-vs-finite \| coverage fixtures | 1 | pinets-sole:1 | `v7 0329` plot[0][47] 3416256000312.276 != null |
| later-na-vs-finite \| dcaoyuan-vibetrader | 1 | pinets-sole:1 | `v5 0751` plot[0][13] 100 != null |
| later-na-vs-finite \| deepentropy-lightweight-charts-indicators | 1 | pinets-sole:1 | `v5 0723` plot[0][9] null != 84.72769338393734 |
| later-na-vs-finite \| g-moe-Trading-Indicators | 1 | pinets-sole:1 | `v6 0533` plot[0][13] 100 != null |
| later-na-vs-finite \| hasnocool-tradingview-pine-scripts | 1 | pinets-sole:1 | `v7 0295` plot[0][38] 102.2180975053 != null |
| later-na-vs-finite \| iamrichardD-tradingview | 1 | pinets-sole:1 | `v6 0715` plot[0][157] null != 110.81423144736519 |
| later-na-vs-finite \| ijonas-pines | 1 | pinets-sole:1 | `v6 0244` plot[4][14] null != 100 |
| later-na-vs-finite \| kantomu-prm | 1 | pinets-sole:1 | `v6 0416` plot[0][13] 100 != null |
| later-na-vs-finite \| muncitorii-muncitorii-ro | 1 | pinets-sole:1 | `v6 0891` plot[0][4] 106.5216974434 != null |
| later-na-vs-finite \| Opus-Aether-AI-pine-transpiler | 1 | pinets-sole:1 | `v5 0899` plot[0][29] null != 138.81211482203682 |
| later-na-vs-finite \| RSKPixel-tfw-streamlit | 1 | pinets-sole:1 | `v6 0630` plot[0][70] 135.3758808211 != null |
| warmup-na-vs-finite \| MeridianAlgo-Pine-A-Script | 1 | pine-a-script-sole:1 | `v7 0225` plot[0][0] 0 != null |

## Inputs

Cross-check JSON: `reports/external-pine-consensus-vector-crosscheck-v1.json`, measured at `3759316856627ddebd78bc27f4fabb60d7fb48c3`, sha256 `025b59f40243d3f034e028f98df4a152179d8697e9fe92f8128f3292916296eb`.
Consensus JSON: `reports/external-pine-consensus-full-v1.json`, sha256 `078792b4593647e1aca5a27cd9408cad905ba9628286be0da5a9b89b5dd80791`.
PineTS grammar/precedence audit JSON: `reports/external-pine-consensus-pinets-grammar-precedence-audit-v1.json`, sha256 `caf6969a5c42cb24fc977668e7b1ab0d21b3a051168b3d3410118faae189a799`.

