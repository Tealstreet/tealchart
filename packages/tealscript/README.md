# @tealstreet/tealscript

A PineScript-inspired indicator scripting language for charting libraries.
Ships a hand-written PEG parser, a strongly-typed AST, a series-based
runtime, and a Web Worker harness so indicators can run off the main
thread.

> **Note:** Tealscript is _PineScript-inspired_, not PineScript-compatible.
> It implements a subset of v6-style syntax with custom semantics, and is
> not affiliated with or endorsed by TradingView, Inc.

## What it is

- **Parser** — a hand-written [Peggy](https://peggyjs.org/) grammar
  (`src/parser/grammar.peggy`) compiled to JS. Produces a typed AST
  defined in `src/parser/ast.ts`.
- **Runtime** — a bar-by-bar interpreter (`src/runtime/engine.ts`) that
  evaluates the AST against OHLCV series, manages `var` / `varip` /
  regular scoping, and collects plot outputs.
- **Worker** — a Web Worker entry (`src/worker/worker.ts`) plus a
  main-thread wrapper (`src/worker/TealScriptWorker.ts`) and message
  protocol so heavy indicator computation stays off the UI thread.
- **Semantic analyzer** — `check()` returns typed diagnostics
  (line/column/severity) suitable for driving Monaco-style editor
  features (markers, hovers, signature help, completion).

## Status

Early. The package is shipped as part of the
[`tealchart`](https://github.com/Tealstreet/tealchart) charting stack,
where it powers built-in and user-authored indicators. APIs may move
without notice until 1.0.

## Install

Distributed as **source** (not published to npm). Vendor it from the source
mirror (e.g. as a git submodule) and let your bundler transpile the TypeScript.

`peggy` is the only runtime dependency.

## Quick start

```typescript
import { check, parse, runScript } from '@tealstreet/tealscript';

const source = `
indicator("My SMA")
length = 14
plot(ta.sma(close, length), color=color.blue, linewidth=2)
`;

// 1. Validate (parse + semantic check)
const diagnostics = check(source).filter((d) => d.severity === 'error');
if (diagnostics.length > 0) {
  console.error(diagnostics);
  process.exit(1);
}

// 2. Parse to AST
const ast = parse(source);

// 3. (Optional) run via the worker harness against bar data — see the
//    `src/worker/` files for the message protocol.
```

## Architecture

Three layers, kept independent:

```text
parser/   PEG grammar → AST                  (no runtime deps beyond peggy)
runtime/  AST → series evaluation per bar    (no DOM, no I/O)
worker/   Web Worker host + main-thread API  (browser-only)
semantic/ Type-aware diagnostics             (parser-only deps)
```

The parser and runtime are usable in Node.js as well as the browser.
Only the `worker/` entrypoint needs a real Web Worker environment.

## Rebuilding the parser

```bash
yarn build:parser
```

This runs `scripts/build-parser.js` to regenerate
`src/parser/generated.js` and `src/parser/generated.d.ts` from
`grammar.peggy`. **Always commit the generated files alongside grammar
changes.**

## License

MIT — see [LICENSE](./LICENSE).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All commits must be signed
off (DCO).
