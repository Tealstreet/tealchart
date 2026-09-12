> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Refetch 179de051c4 V1

Measurement commit: `179de051c4102e135587fd9d04b7fbff5521f82e`

## Corpus Refetch

- Source manifest/report: `packages/tealscript/reports/external-pine-corpus-v5.report.json`
- Durable local corpus path: `packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910`
- Absolute path: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910`
- Git ignore coverage: `.gitignore:73:.cache`
- Rows requested: 1000
- Rows recovered: 1000
- Repositories recovered: 89
- Rows failing to resolve: 0
- Recorded byte-size mismatches: 0
- Recorded SHA-256 hashes added: 1000 rows in `external-pine-corpus-v5.manifest.json` and `external-pine-corpus-v5.report.json`
- Hash-aware full refetch: 1000 bytes matched, 1000 hashes matched
- Hash negative smoke: a one-row report with an intentionally wrong hash failed with `sha256 mismatch`
- Relative output smoke: `--output .cache/tealscript/pine-corpus-v5-hash-smoke` resolved under the repo root, not under the package cwd

The pre-existing committed v5 manifest and report recorded repository, path,
pinned commit SHA, and byte size, but not content hashes. This refetch therefore
could only prove pinned URL resolution plus exact byte size for the recovery
that had already happened. The manifest and report now include `sourceSha256`
per row, and the refetch/runner tooling verifies it when present.

## Pinned Measurement

- Final report: `packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/runs-179de051c4/report-179de051c4-final.json`
- Rows: 1000
- Repositories: 89
- Funnel: parse 979, semantic 795, compile 793, execute 783, output 772
- Current classifier headline: 779 supported / 935 achievable = 83.32%
- Fixed baseline-denominator headline: 779 supported / 915 achievable = 85.14%

Baseline from `external-pine-corpus-v5.remaining-gap-dispatch-v2.md`:

- 832 supported / 915 achievable = 90.93%
- 83 TealScript gaps
- 75 invalid Pine rows
- 10 unsupported-by-design rows

Delta against the fixed 915-row denominator:

- Supported rows: -53
- Support rate: -5.79 percentage points
- TealScript gaps on the fixed denominator: 136

Control measurements against the same refetched corpus:

- User-specified old SHA `785155abe32395a16ffd7e52a7d8e8b00c5932e0`: 771 supported on the same fixed 915-row denominator.
- Committed report measurement SHA `1bd0cf4926b508a143fa3b57f585b191215b17a7`: 832 supported, matching the baseline report.
- First commit after baseline, `37a40e99ef4743dfb12a24c94833354441d6e970`: 832 supported.
- Next commit, `791bc65c457f26952130beb8a3f190bed3425ba9`: 832 supported.
- First low commit, `5586a375bc202f85d55b3dd2a12a33d8d56bd6a3`: 771 supported.
- Branch first parent before master merge, `8d04cd1bc9843b6a6215f03745f712a3b8d725dd`: 779 supported.
- Post-install rerun of `179de051c4102e135587fd9d04b7fbff5521f82e`: 779 supported.

Conclusion: the refetched corpus is not the cause of the 779 result. Running the
exact SHA recorded in `external-pine-corpus-v5.report.json` reproduces the 832
baseline against the refetched files. A root `yarn install` did not change the
179 result. The first measured drop is `5586a375bc`, `fix(tealscript): reject
unsupported strategy margin settings`, which moved 61 formerly-supported rows to
the `unsupported-feature` semantic diagnostic. Later branch commits recovered
some rows, leaving 779 at `179de051c4`. `785155abe3` is not the SHA that
produced the committed 832 report.

The current classifier reports a different denominator because it classifies 55
invalid Pine rows and 10 unsupported-by-design rows. The fixed-denominator number
above reconstructs the earlier 915-row denominator from the committed invalid
version audit plus unsupported rows.

## Leading Current Causes

- `unsupported-feature`: 66
- `type-mismatch`: 26
- `unknown-argument`: 24
- `unexpected-token`: 20
- `unknown-identifier`: 14
- `unknown-function`: 12
- `unresolved-import`: 10
- `duplicate-argument`: 7
- `duplicate-symbol`: 7
- `implicit-numeric-bool`: 5
- `argument-count`: 4
- `array-bounds-runtime-error`: 4

## Parser-Rejection Reclassification

Static audit of the 13-row parser-rejection cluster found that most of the
cluster is not a TealScript engine gap:

- Corpus hygiene, literal elision marker `...`: 8 rows (`0796`, `0798`, `0880`, `0894`, `0895`, `0897`, `0916`, `0936`)
- Corpus/probe hygiene, CRLF/probe artifact: 2 rows (`0828`, `0910`)
- Invalid Pine import syntax: 1 row (`0927`)
- Real parser gaps: 2 rows (`0197`, `0519`)

Restated against the fixed 915-row denominator at `179de051c4`:

- TealScript gaps: 136 before this reclassification, 125 after moving 11 non-gap rows out.
- Achievable denominator: 915 before this reclassification, 904 after excluding 10 hygiene rows and 1 invalid-Pine row.
- Supported rate: 779/904 = 86.17%.

The harvester now rejects standalone literal `...` elision markers at ingest so
truncated sources do not enter future corpora as parser failures.

## Dispatch Tail

`external-pine-corpus-v5.remaining-gap-dispatch-v2.md` contains 27 root causes.
Of those, 15 are single-row causes:

- `Compilation error: Duplicate parameter name not allowed in this context`
- `Compilation error: Identifier '_iter' has already been declared`
- `deep-expression execution cost`
- `exported request expression analysis`
- `float/na ternary assigned to bool`
- `lower-timeframe request execution`
- `missing math.tanh builtin`
- `na assigned to a bool UDT field`
- `numeric ta.change(basis) as ta.valuewhen condition`
- `numeric ta.change(strategy.closedtrades) as ta.barssince condition`
- `official library registry/import support`
- `request warmup/data sufficiency`
- `runtime construct failed under corpus inputs`
- `table.cell(table_id = table, ...) named first parameter`
- `versioned bool/na semantics`
