# External Pine Corpus V7 Parse-Stage Census

Measured: 2026-09-11
Code under test: `69c43143ac + this report's parser changes`
Worktree: `tealscript-parser`
Data: `pine-corpus-v7-20260911`
Full row data: `external-pine-corpus-v7-parse-stage-census-20260911.json`

## Purpose

This is the parse-stage census for the targeted v7 external corpus. The v7
corpus is not a random sample: it was harvested to hit previously untouched
Pine members, so a rougher parse/semantic surface here is expected and useful.

This pass parses every cached v7 source at current HEAD, buckets parse failures
by construct shape, and separates confirmed parser-owned rows from invalid
Pine, corpus artifacts, and rows that still need TradingView/compiler evidence.
It does not run semantic checking, codegen, runtime, or output comparison.

## Inputs

| Corpus | Cache | Sources measured | Declared versions |
| --- | --- | ---: | --- |
| v7 | `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-corpus/packages/tealscript/.cache/tealscript/pine-corpus-v7-20260911/sources` | 456 | v5 214, v6 242 |

Declared versions come from the v7 manifest, not a source-text regex, because
some cached files contain source preambles or unusual placement that confuse a
simple scanner.

## Summary

| Corpus | Total | Parsed | Parse failures |
| --- | ---: | ---: | ---: |
| v7 | 456 | 440 | 16 |

## Parse Split

| Split | Rows | Meaning |
| --- | ---: | --- |
| Confirmed TealScript parser gaps | 0 | None remain after the enum-field indentation boundary fix. |
| Confirmed invalid Pine | 5 | Numeric enum-value assignments and call expressions as tuple assignment targets are not valid Pine for the declared version. |
| Corpus artifacts / non-source rows | 6 | Token-list syntax fixtures, detached/preamble source, mustache templates, and ellipsis placeholders. |
| Still unclassified | 5 | Needs TradingView/compiler evidence before being called invalid or parser-owned. |

## Bucket Census

| Bucket | Rows | Split | Examples | Verdict |
| --- | ---: | --- | --- | --- |
| Non-source/token/template artifact | 6 | Corpus artifact | `0024`, `0025`, `0026`, `0123`, `0340`, `0344` | Not Pine source as cached: token list, detached/preamble source, mustache template, or ellipsis placeholder. |
| Numeric enum field assignment | 4 | Invalid Pine | `0229`, `0231`, `0233`, `0234` | Pine enum field assignments are titles, not numeric enum values; numeric RHS is invalid by declared v6. |
| Switch arm condition line-wrapped before `=>` | 3 | Unclassified | `0078`, `0079`, `0080` | Needs compiler evidence; do not change grammar from source shape alone. |
| Comma-separated import declarations | 1 | Unclassified | `0181` | Needs compiler evidence; source-only judgement is insufficient for this published-looking editor-pick row. |
| Invalid tuple assignment target | 1 | Invalid Pine | `0033` | Tuple assignment targets must be assignable Pine targets, not `globals.get(...)` calls. |
| Tuple declaration `=` after blank continuation line | 1 | Unclassified | `0253` | Needs compiler evidence before changing another block/continuation boundary. |

## Parser-Owned Queue

Zero parser-owned rows remain.

The previous two-row enum-title queue (`0101`, `0102`) is closed. The root
cause was not the enum title production itself: minimal enum fields like
`On = "ON"` already parsed. The full source failed because a later two-space
UDF body triggered the global indentation normalizer, which promoted earlier
four-space enum fields to an eight-space nested block and closed the enum
incorrectly. The grammar already accepts two-space indentation directly, so the
normalizer now only rewrites the three-space indentation shape it was intended
to repair.

## Unclassified Parse Queue

These five rows are deliberately not assigned:

- `0078`, `0079`, `0080`: condition-only `switch` arms where the condition and
  `=>` are split across lines.
- `0181`: multiple `import ... as ...` declarations comma-separated on one
  line.
- `0253`: tuple declaration whose `=` appears after a blank continuation line.

They may be invalid Pine, parser gaps, or source-copy artifacts. The census
keeps them out of the owned queue until compiler evidence settles the shape.

## Measurement Notes

The census was run by importing `parse` from `packages/tealscript/src/parser`
and reading every case-insensitive `.pine` file in the v7 cache. Each parse
failure records source path, manifest declared version, location, diagnostic,
source line, upstream repo/path, and classification in the JSON report.

## Corpus-Lane Reconciliation

The corpus lane routed eight parse-stage real rows from
`external-pine-corpus-v7.current-gap-pool-bbcbf3d220-v1.md`. Re-measuring those
eight at current HEAD found no census miss:

- `0101`, `0102`: real parser gaps, now fixed by the indentation-boundary
  change above.
- `0115`, `0116`: stale in the corpus-lane list; both parse and pass semantic
  at current HEAD.
- `0078`, `0079`, `0080`, `0253`: present in this parse population but still
  unclassified. Calling them real parser gaps requires TradingView/compiler
  evidence; the corpus lane overclaimed these from source shape alone.
