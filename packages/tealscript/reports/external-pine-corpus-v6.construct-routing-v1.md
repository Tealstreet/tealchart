> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v6 Construct Routing v1

Date: 2026-09-11
Auditor: codex-jlxeb6

This note routes the four construct-level real gaps from
`external-pine-corpus-v6.remaining-cause-audit-v1.md`. It intentionally does
not propose or implement fixes.

## Routing Summary

| Construct | Minimal row evidence | Believed owner | Why |
| --- | --- | --- | --- |
| Official TradingView library imports | `0483`, `0985` | Semantic / library registry | Parsing accepts `import`; the failure is resolver/classifier knowledge for official TradingView library surfaces. |
| `table.cell` receiver-method named arguments | `0129` | Semantic | The source parses and type-check reaches method overload resolution; the bad behavior is named-argument binding after receiver desugaring. |
| `for` expression declaration binding | `0310` | Parser, with semantic follow-through | The construct is `result = for ...`; if the parser does not represent loop expressions as declaration initializers, semantic never gets a bound local. If the AST is already correct, semantic owns the symbol binding, but route parser first because the failure smells like declaration-form loss. |
| Exported const color expression | `1000` | Semantic | The parser accepts `export const color`; the failure is constness validation of `color.new(...)` with const inputs. |

## Minimal Repros

### Official TradingView Library Imports

```pine
//@version=6
indicator("official import repro")
import TradingView/RelativeValue/3 as rv
plot(na)
```

Expected owner: semantic / library registry.

The diagnostic is `unresolved-import`, not a syntax failure. Third-party closed
TradingView libraries remain unsupported-by-design, but imports under the
`TradingView/...` namespace are official library surfaces and should route to
the resolver/standard-library registry owner.

### `table.cell` Receiver-Method Named Arguments

```pine
//@version=6
indicator("table method text_color repro")
var table t = table.new(position.top_right, 1, 1)
if barstate.islast
    t.cell(0, 0, "x", text_color=color.white)
```

Expected owner: semantic.

`table.cell()` accepts `text_color`. The method form should bind receiver `t` as
`table_id` and preserve named-argument validation against the remaining
signature. The observed failure is overload/named-argument resolution, not
parsing or runtime behavior.

### `for` Expression Declaration Binding

```pine
//@version=5
indicator("for expression declaration repro")

testFunc() =>
    result = for i = 1 to 10
        i
    result

plot(testFunc())
```

Expected owner: parser first, semantic second.

Pine v5 loop syntax permits assigning the return value of a loop to a variable.
The symptom is semantic (`Unknown identifier: result`), but the ownership risk
is the AST shape: `result = for ...` must be represented as a local declaration
whose initializer is a loop expression. If the parser already emits that shape,
then the handoff should move to semantic symbol binding.

### Exported Const Color Expressions

```pine
//@version=6
library("ConstColorLib", true)
export const color SHADED_RED = color.new(color.red, 92)
```

Expected owner: semantic.

The parse form is accepted. The failure is the exported-constant validator
treating `color.new(color.red, 92)` as non-literal/non-exportable even though
the call has const inputs and yields a const color.
