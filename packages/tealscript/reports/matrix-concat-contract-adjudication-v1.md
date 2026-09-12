# Matrix Concat Contract Adjudication v1

Date: 2026-09-12

## Verdict

Pine `matrix.concat(id1, id2)` mutates `id1` by appending `id2` rows and
returns `id1`.

The prior TealScript change that returned a detached matrix copy was wrong.
It was justified by one corpus script beginning to produce output, but that is
evidence about that script, not evidence of Pine's matrix contract.

## Reference

TradingView's matrices manual says `matrix.concat()` appends the rows of `id2`
to `id1` when the matrices have the same number of columns. The official
example calls `m1.concat(m2)` without assigning the result and then displays
`m1` as the appended-row matrix.

That agrees with TealScript's existing array helper contract:
`array.concat(id1, id2)` mutates and returns the left operand.

## Fix

`concatMatrix()` now:

- returns `id1` itself;
- appends `id2.values` into `id1.values`;
- increments `id1.rows`;
- keeps `matrix.concat(m1, emptyMatrix)` returning `m1`, not a copy;
- initializes an empty `id1` from `id2` while still returning the original
  `id1` handle.

The runtime tests restore the identity assertion:

```ts
expect(concatMatrix(left, right)).toBe(left)
```

and the compiled test now verifies that both the returned value and the original
left matrix observe the appended rows.

## Corpus Note

The earlier detached-copy change made a corpus row produce output by preserving
the left matrix for a later square-only operation. Since Pine's documented
contract mutates the left matrix, that row's issue is not a `matrix.concat`
contract defect. It must be explained by the script's own assumptions, by
another engine behavior, or by trace/manual evidence outside this concat
contract.

## Verification

Red before helper fix:

```text
yarn vitest run packages/tealscript/src/runtime/matrices.test.ts -t 'concatenates matrices by appending rows'
```

failed on `expect(concatMatrix(left, right)).toBe(left)`.

## Sources

- TradingView matrices manual:
  https://www.tradingview.com/pine-script-docs/language/matrices/#concatenating-matrices
