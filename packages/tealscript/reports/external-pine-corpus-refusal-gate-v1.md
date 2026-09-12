# External Pine Corpus Refusal Gate V1

Measured 2026-09-12 at `3670fa225b`.

## Result

`yarn workspace @tealstreet/tealscript pine:external-corpus:refusal-gate`
passes on current HEAD:

- Rows: `6`
- Expected refusals: `6`
- Output rows: `0`
- Direct runtime: `2.78s`
- Vitest runtime: `5.36s`

The companion test is
`tests/compat/external-corpus-refusal-gate.test.ts`. The fixture lives under
`tests/compat/fixtures/fast-corpus-refusal/`, and source hashes are verified by
the shared external-corpus runner before the gate classifies any row.

This gate is the sibling of `external-pine-corpus-fast-gate-v1.md`, not a
replacement for it. The acceptance gate asserts selected rows still produce
output. This refusal gate asserts selected rows still fail with their specific
Pine refusal, so a correct refusal cannot silently become an acceptance and
inflate corpus output counts.

## Fixture

| Row | Declared version | Expected stage | Expected diagnostic substring | Purpose |
| --- | ---: | --- | --- | --- |
| `ta_invalid_length_v6.pine` | v6 | execute | `TA length must be a positive integer` | Invalid TA length refusal; this class moved 43 corpus rows when silent coercion became a correct refusal. |
| `iff_removed_v5.pine` | v5 | semantic | `iff() was removed in Pine v5` | Modern Pine must refuse removed legacy `iff()`. |
| `iff_removed_v6.pine` | v6 | semantic | `iff() was removed in Pine v5` | Same removed `iff()` rule under declared v6. |
| `request_barmerge_runtime_v6.pine` | v6 | semantic | `request.security lookahead must be a compile-time barmerge value` | Runtime-computed `request.security(..., lookahead=...)` must stay refused. |
| `v6_linewidth_zero.pine` | v6 | semantic | `plot linewidth must be at least 1 in Pine v6` | v6 migration sentinel for `linewidth=0`, valid in v3-v5 and refused in v6. |
| `array_slice_descending_v6.pine` | v6 | execute | `Index 'from' should be less than index 'to'` | Runtime Pine error must stay surfaced instead of being swallowed into output silence. |

## Red Proof

The gate was copied unchanged into historical worktrees and run against the
engine at the named commits. These are deliberately grouped by what they prove.

Acceptance-red proofs:

| Historical commit | Pre-fix class | Gate-observed old behavior |
| --- | --- | --- |
| `7711860b67` | Invalid TA length, parent of invalid-length refusal work | `ta_invalid_length_v6.pine` produced output instead of refusing. |
| `14bca9c758` | Modern `iff()` before `e7136357a8` | Both `iff_removed_v5.pine` and `iff_removed_v6.pine` produced output instead of refusing. |
| `c5f52a6145` | Computed request barmerge before `7ca448b4f4` | `request_barmerge_runtime_v6.pine` produced output instead of refusing. |

Specific-refusal/surfacing proofs:

| Historical commit | Class | Gate-observed old behavior |
| --- | --- | --- |
| `785155abe3` | v6 `linewidth=0`, parent of version-rule centralization at `f02cf9ea60` | Row failed semantically, but only with generic `plot linewidth must be a positive integer`; the current gate requires the version-specific v6 migration refusal. |
| `4e5150e715` | Descending `array.slice`, parent of surfaced error `3cbadb64dd` | Row reached execution and then reported output silence while the Pine runtime error was swallowed; the current gate requires the specific surfaced runtime refusal. |

No row in this fixture is claimed to cover value-only fixes such as
`array.new*()` omitted `initial_value` becoming Pine `na`, or collection sort
enum normalization. Those can change values without changing acceptance, so an
acceptance/refusal gate is the wrong instrument for them.

## Contract

This is a fast subset gate. It catches regressions that hit these six refusal
shapes only. A green run does not mean the full corpus is clean, does not prove
TradingView value correctness, and does not replace an attributed pinned corpus
rerun after behavior changes.
