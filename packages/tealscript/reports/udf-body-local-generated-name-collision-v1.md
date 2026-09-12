# UDF Body-Local Generated Name Collision

Date: 2026-09-12  
Branch: `tealscript-runtime`  
Result: fixed generated-name collisions for ordinary UDF body locals.

## Defect

The prior UDF collision fix prefixed Pine parameters (`ctx` -> `_p_ctx`,
`_state` -> `_p__state`) but ordinary body locals still emitted their raw
escaped Pine names. A UDF body local named `ctx` therefore collided with the
generated runtime context parameter, and a body local named `_state` collided
with the generated per-call-site state parameter.

## Red-First Reproduction

Added a compile end-to-end test:

```pine
//@version=6
indicator("runtime local names")
f() =>
    int ctx = 2
    int _state = ctx + 3
    _state
plot(f())
```

Before the fix, compilation failed while constructing the generated class:

```text
Compilation failed: Compilation error: Identifier 'ctx' has already been declared
```

## Fix

UDF regular locals now use generated-private local names (`_l_*`) instead of raw
Pine names, matching the existing generated-private parameter convention. The
same mapping is used by ordinary declarations, multi-declarations, inline block
expression lowering, and call-result branches that declare a local.

The old `paramNames.includes('_state')` guard is now removed: every emitted Pine
parameter is `_p_*`, so it can no longer be exactly `_state`.

## Verification

Focused gate:

```text
yarn vitest run packages/tealscript/src/runtime/codegen/compile.test.ts -t 'escapes UDF body locals|escapes Pine parameters|escapes the implicit function state parameter|same-named regular UDF locals'
```

Result: passed (`3` tests, `41` skipped).

