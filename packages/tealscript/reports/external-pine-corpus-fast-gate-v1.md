# External Pine Corpus Fast Gate v1

Date: 2026-09-12

Gate fixture selected at commit `97e24ceafc`.

Entry points:

- `yarn workspace @tealstreet/tealscript pine:external-corpus:fast-gate`
- `yarn workspace @tealstreet/tealscript vitest run tests/compat/external-corpus-fast-gate.test.ts`

## Purpose

This is a fast acceptance-regression gate over a deliberately small real-script
subset. It catches rows that used to be accepted and produce output but now fail
parse, semantic check, compilation, execution, or output production.

It does not prove full-corpus health. A green fast gate means only that these
selected rows still produce output. Full corpus movement still requires a pinned
v5/v6/v7 rerun with commit attribution.

## Selection

The fixture contains `12` real pinned public corpus sources, copied into
`tests/compat/fixtures/fast-corpus-acceptance` with repo, path, commit SHA and
source hash retained in the fixture manifest.

The subset was chosen from the measured v5/v6/v7 corpus rather than sampled
randomly:

| Source row | Declared version | Shape guarded |
| --- | ---: | --- |
| v5 `0471` Chandelier Exit | 6 | High-use input slots, color constants, plots and alerts. |
| v5 `0476` Unit Testing Framework | 5 | Table/drawing output plus input color/string metadata. |
| v5 `0478` Price Volume Trend | 4 | The real bare-`pvt` TA variable regression found by the full corpus rerun. |
| v6 `0162` Accumulators | 6 | TA float member aliases in public log output. |
| v6 `0341` Direct MTF EMAs | 5 | TA alias use, request-style shape, plots and alert output. |
| v6 `0577` Breakouts with Tests & Retests | 5 | Drawing-heavy nested switch-arm value shape recovered by runtime fixes. |
| v6 `0145` Scoring Overlay | 6 | Request-expression script with plots, drawings and alerts. |
| v7 `0160` Matrix Eigenvectors | 6 | Targeted matrix eigenvector surface. |
| v7 `0183` Matrix Pseudo-Inverse | 6 | Targeted matrix pseudo-inverse surface. |
| v7 `0334` Strategy Opentrades Fields | 5 | Strategy state/opentrades fields from the high-use strategy surface. |
| v7 `0363` Box Named Const Options | 6 | Drawing constructor named constant options and box output. |
| v7 `0399` Argument Ordering | 6 | High-use optional argument ordering across input/plot/alert surfaces. |

## Red Proof

This gate was checked against historical engine commits where selected rows are
known to have failed:

| Engine commit | Result | Red row | Diagnostic |
| --- | ---: | --- | --- |
| `b702388213` | `11/12` output rows | v5 `0478` Price Volume Trend | `pvt is not defined` from the declared-v4 legacy bare `pvt` regression. |
| `7ee7a2c98b` | `11/12` output rows | v6 `0577` Breakouts with Tests & Retests | `output-silence:conditional-or-data-gated-output-not-triggered`, the nested switch-arm/drawing output class later repaired by `99fb4693b2` / `9458ae288e`. |

The same fixture is green at `8e3fa3d76e`: `12/12` rows produce output. That
proves the gate can fail for the regression it was built from, and also for a
second corpus-recovered acceptance class. It remains a subset gate, not a full
corpus proof.

## Coverage Probes

The same fixture was also checked against other behavior-change pairs from the
session. These probes measure what the gate can and cannot catch; they do not
change the 12-row selection.

| Class | Before | After | Gate movement | Result |
| --- | --- | --- | ---: | --- |
| Invalid TA-length refusal | `7711860b67` | `67e6023355` | `11/12 -> 11/12` | Not caught; none of the selected rows changed output status. |
| `array.new*()` omitted `initial_value` fills Pine `na` | `db5cb079f1` | `e0714c404b` | `12/12 -> 12/12` | Not caught as acceptance; selected rows still produced output. |
| `array.sort` / `array.sort_indices` / `matrix.sort` Pine `order.*` enum values | `8205bd72cd` | `07e89eac16` | `12/12 -> 12/12` | Not caught as acceptance; selected rows still produced output. |
| Modern `iff()` refusal | `14bca9c758` | `e7136357a8` | `12/12 -> 12/12` | Not caught; selected rows have no active v5/v6 `iff(...)` call. |
| Shadowed runtime state regression | `af11666ed8` | `b702388213` | `12/12 -> 11/12` | Caught on v5 `0478`; compiled bar error `pvt is not defined`. |
| Resolver shadow invariant repair | `b22e31ef99` | `ebac5ce93f` | `11/12 -> 12/12` | Caught as the v5 `0478` recovery. |
| Switch-arm drawing repair | `7ee7a2c98b` | `9458ae288e` | `11/12 -> 12/12` | Caught as the v6 `0577` recovery. |

So the fast gate is proven red for two acceptance classes and one repair path,
but it is blind to the TA-length, array-value, sort-enum, and `iff()` movements
measured here. That is expected for a small acceptance subset and is the reason
the full pinned corpus rerun remains required for behavior-change attribution.

## Re-Selection Audit

After the coverage probes above, the fixture was re-audited against the measured
movement rows to see whether a different 12-row all-output subset could cover
more of the night's regression classes without increasing runtime. The result is
no fixture change.

The two rows that must stay are the only green-current public corpus rows with
demonstrated historical red acceptance failures:

| Row | Historical red | Current result | Why it stays |
| --- | --- | --- | --- |
| v5 `0478` Price Volume Trend | `b702388213` fails with `pvt is not defined`. | Produces output. | Proves the bare legacy TA variable resolver regression. |
| v6 `0577` Breakouts with Tests & Retests | `7ee7a2c98b` fails to produce output. | Produces output. | Proves the nested switch-arm/drawing output class. |

The four classes missed by the selected fixture do not have better replacement
rows under the current gate contract:

| Class | Best corpus evidence | Selection decision |
| --- | --- | --- |
| Invalid TA-length refusal | `43` produced-output rows moved to correct execute-stage `TA length must be a positive integer` failures in `external-pine-corpus-current-error-rerun-v1.json`, including v5 `0450`, v6 `0120`, and v7 `0260`. | Not selected: these rows are supposed to fail at current HEAD. Adding one would turn this from an all-output acceptance-regression gate into a mixed expected-refusal gate. |
| `array.new*()` omitted `initial_value` fills Pine `na` | Full v5/v6/v7 attribution found `0` acceptance rows moved at `e0714c404b`. | Not selectable for this gate: this is value/payload coverage, not acceptance coverage. |
| `array.sort` / `array.sort_indices` / `matrix.sort` Pine `order.*` enum handling | Full v5/v6/v7 attribution found `0` acceptance rows moved at `07e89eac16`. | Not selectable for this gate: this is value/payload coverage, not acceptance coverage. |
| Modern `iff()` refusal | Full corpus text scan, after stripping comments and strings, found `0` active v5/v6/v7 `iff(...)` calls. | Not selectable from the real corpus subset: catching this would require a synthetic refusal fixture or a future harvested row. |

Other correct-refusal movements have the same shape as TA length: they are
acceptance-visible, but the demonstrating rows are intentionally red today. That
includes request-expression runtime propagation (`v5 0865`, `v7 0359`), semantic
drawing-type refusal (`v5 0952`), and max-bars-back refusals (`v6 0489`, `v6
0521`, `v6 0598`, `v6 0635`, `v7 0330`) from
`external-pine-corpus-post-ta-rebound-rerun-v1.json`.

So the optimized 12-row all-output selection remains the current fixture:
`0478` and `0577` carry the demonstrated acceptance-regression coverage, while
the remaining ten keep the version/member/construct spread at the same runtime.
Expanding coverage to the missed classes requires a separate fast refusal gate
or value-property gate, not a row swap inside this one.

## Boundary

This gate is intentionally narrow. It is useful because it runs in seconds and
guards representative rows from the families that moved during the corpus
audits. It will not catch regressions outside the selected rows, output value
wrongness, TradingView semantic drift, or trace/host-dependent behavior.

When this gate fails, treat it as an acceptance regression candidate and rerun
the affected row through the full pinned method before changing headline corpus
figures.
