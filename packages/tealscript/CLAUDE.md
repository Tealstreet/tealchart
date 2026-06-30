# CLAUDE.md — @tealstreet/tealscript

TealScript is a PineScript-like indicator scripting language that runs in Web Workers. It provides a PEG parser, AST runtime, and series-based execution model for technical indicators in Tealchart.

## Architecture

Three-layer design: **Parser → Runtime → Worker**

### Parser (`src/parser/`)

- `grammar.peggy` — Hand-written PEG grammar for a PineScript v6 subset
- `parser.ts` — Wrapper with error handling (`parse()`, `validate()`, `formatParseError()`)
- `ast.ts` — Strongly-typed AST node definitions
- `generated.js` / `generated.d.ts` — Auto-generated Peggy parser output (git-tracked)

**Rebuilding the parser:**

```bash
yarn build:parser    # runs scripts/build-parser.js → regenerates generated.js + generated.d.ts
```

Always commit both `grammar.peggy` and the generated files together.

### Runtime (`src/runtime/`)

- `engine.ts` — Core interpreter. Evaluates AST bar-by-bar.
- `context.ts` — Execution state: OHLCV series, `barstate`, `syminfo`, `timeframe`, plots, inputs
- `series.ts` — `Series<T>` class: time-series values with history access
- `scope.ts` — Variable scoping with `var`/`varip`/regular semantics

**Execution flow:**

1. Parse script → AST
2. Create `ExecutionContext` with bar data
3. Iterate bar-by-bar, evaluating statements
4. Collect plot outputs per bar
5. Support realtime rollback for intrabar updates

### Worker (`src/worker/`)

- `worker.ts` — Web Worker entry point
- `TealScriptWorker.ts` — Main-thread wrapper
- `protocol.ts` — Message types between main thread and worker

## Series Semantics

The core concept — every value is a series with history:

```
series[0]   // Current bar
series[1]   // Previous bar
series[n]   // n bars ago
```

**Variable persistence:**

- `var x = 0` — Initialized once, persists across bars
- `varip x = 0` — Persists even during intrabar updates
- `x = 0` — Re-evaluated every bar

**Realtime updates:** `commit()` finalizes a bar; `rollback()` reverts to last commit for intrabar recalculation.

## Built-in Functions

Registered in `engine.ts` via `registerBuiltins()`:

| Category           | Functions                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Math               | `math.abs`, `math.max`, `math.min`, `math.sqrt`, `math.pow`, `math.round`, etc.                      |
| Technical Analysis | `ta.sma`, `ta.ema`, `ta.rsi`, `ta.macd`, `ta.bollinger`, `ta.highest`, `ta.lowest`, `ta.cross`, etc. |
| Input              | `input.int`, `input.float`, `input.bool`, `input.string`, `input.color`, `input.source`              |
| Plotting           | `plot`, `hline`, `bgcolor`, `plotshape`, `plotchar`, `plotarrow`, `fill`                             |
| Color              | `color.red`, `color.green`, ...; `color.new(color, transparency)`                                    |
| Utility            | `nz()` (replace NaN), `na()` (check NaN)                                                             |

**Adding a new built-in:** Add to the appropriate `register*Builtins()` method in `engine.ts`, then add tests.

## Worker Protocol

**Main → Worker:** `init`, `updateBars`, `updateBar`, `setInputs`, `dispose`
**Worker → Main:** `ready`, `result` (plots + inputs), `error`, `parseError`

## Grammar Features

Supported: version annotations, indicator declarations, variable declarations (var/varip/typed), if/else, for, while, break/continue, binary/unary/ternary operators, function calls with named args, member access, index/history access, literals (number, string, boolean, color, na), comments.

**Not supported:** Function definitions, user-defined types, imports, strategy declarations, libraries.

## Commands

```bash
yarn build:parser     # Regenerate parser from grammar.peggy
yarn build-force      # Build with tsup
yarn dev-force        # Watch mode
yarn test             # Vitest
yarn typecheck        # tsc --noEmit
yarn lint             # ESLint
```

## Key Files

| File                             | Purpose                    |
| -------------------------------- | -------------------------- |
| `src/runtime/engine.ts`          | Core interpreter           |
| `src/parser/generated.js`        | Auto-generated parser      |
| `src/parser/grammar.peggy`       | PEG grammar                |
| `src/parser/ast.ts`              | AST type definitions       |
| `src/worker/TealScriptWorker.ts` | Main-thread worker wrapper |

## Gotchas

- `generated.js` is auto-generated — edit `grammar.peggy`, not the generated file
- Loop iterations are capped at 10,000 (safety limit in engine)
- `na` is represented as `NaN` internally; `na == na` is false (PineScript semantics)
- ESLint ignores generated parser files (configured in `eslint.config.mjs`)
- The worker entry point requires bundler URL resolution: `new URL('@tealstreet/tealscript/worker', import.meta.url)`
