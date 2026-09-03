# Mobile Runtime Plan v1

How Tealchart hosts the TealScript runtime across web, mobile and CLI, and why
it converges on a single execution backend.

## Decision

**One backend: `compiled`. Mobile hosts it in a hidden WebView, shipped as a
bundled asset inside this package.**

The interpreter and the closure backend are both removed. Mobile stops
executing scripts inline on the React Native JS thread.

## Why one backend

Tealchart carried three implementations of Pine semantics — an AST interpreter,
a string-codegen `compiled` backend, and a bound-closure backend. Three
implementations of one language drift, and the drift is silent because output
comparisons only compare the fields they happen to compare.

Measured against 246 real user scripts from 42 public repositories, the
differential between backends surfaced 83 scripts producing divergent output
that no existing test caught, and eight defects in already-shipped code:

- interpreter handed scripts wrong input values (persisted-key reuse)
- interpreter dropped drawings under realtime
- `array.unshift` resolved against a local named `array`
- compiled finalized strategy ledger state on unconfirmed bars
- compiled omitted OCA fields, so brackets never cancelled
- compiled generated invalid JS on empty panes (160 swallowed errors)
- compiled lost alert retention on long history
- compiled and interpreter both missing strategy metric history

Every widening of the comparison found something. That is the cost of parallel
implementations, and it does not decrease with more tests — it decreases with
fewer implementations.

## Why `compiled` and not the alternatives

The closure backend existed for exactly one reason: mobile was assumed unable
to evaluate `new Function()`, so a no-eval execution path was required. That
assumption was never verified — React Native's bundled `hermesc` accepts
`new Function` and emits bytecode constructing the global `Function` object,
and no Hermes runtime smoke was ever run to settle it.

A WebView is a full browser engine, so the constraint does not apply there at
all. With eval available on every runtime, the choice is made on merit:

- `compiled` is the fastest backend (closure measured ~1.94× slower).
- `compiled` already implements request subprograms
  (`compileSecurityExpression` + `evaluateSecuritySeries`). Building the
  equivalent for closure was costed at 10–16 engineering days and is avoided
  entirely by not choosing closure.
- `compiled` already ships on web and CLI.

## Distribution constraint

**Tealchart is an installable package. It cannot require a consumer to host a
WebView runtime anywhere.**

This is the constraint that decides the design. A consumer installs the
package, adds `react-native-webview` as a peer dependency, and it works. No
deployed origin, no URL to configure, no server.

So the runtime ships **as a bundled asset inside the package** — a
self-contained HTML + JS artifact carrying the compiled TealScript runtime,
loaded via `source={{ html }}` or a packaged asset.

Consequences, all favourable:

- **No version skew.** Manager and worker ship in the same package version and
  cannot drift across an app release. A remotely served worker can change
  underneath a shipped app; a bundled one cannot.
- **No network dependency at cold start**, and it works offline.
- **No app-store question.** Apple restricts _downloading_ executable code.
  Shipping it in the binary and executing it in a WebView is ordinary
  hybrid-app behaviour.

The cost is package size — roughly 150–250KB gzipped, larger inlined — and
losing the ability to hotfix a script bug without an app release. For a
distributable package that is the right trade.

**This adds no React Native dependency to the package.** The bundled artifact
is pure web JS. Only the thin factory that constructs the `WebView` imports
`react-native-webview`, and it follows the pattern already used for
`react-native`, `@shopify/react-native-skia`, `react-native-gesture-handler`,
`react-native-reanimated` and `react-native-worklets`: declared in
`peerDependencies`, marked `optional: true` in `peerDependenciesMeta` so
web-only consumers install nothing, and mirrored in `devDependencies` purely so
this repo can typecheck and test the native code. Zero React Native packages
appear in `dependencies`.

A host application may still serve _its own_ workers remotely for its own
reasons; that is an application concern and has nothing to do with tealchart.

## Mobile hosting options

| Option                            | Cold start      | Extra memory | `new Function` | Off JS thread | Native code       |
| --------------------------------- | --------------- | ------------ | -------------- | ------------- | ----------------- |
| **Hidden WebView, bundled asset** | ~200–500ms once | ~30–60MB     | yes            | yes           | none              |
| 2nd JSI runtime (Hermes)          | tens of ms      | a few MB     | **no**         | yes           | yes               |
| 2nd JSI runtime (JSC)             | ~50–150ms       | ~10–20MB     | yes            | yes           | yes, ×2 platforms |
| Inline on JS thread (status quo)  | 0               | 0            | **no**         | **no**        | none              |

Figures are order-of-magnitude estimates, not device measurements.

A Hermes worklet runtime is cheapest and fails the one requirement that matters
— no eval means interpreter-only, which is the thing being removed. A JSC
runtime in a custom native module is the only real alternative, and it costs
native code on two platforms plus the property below.

**That property: with a WebView, mobile _is_ web.** Same backend, same class of
JS engine, same parse/semantics/execution/output. The corpus result transfers
wholesale, and the mobile-specific correctness surface shrinks to the bridge.

## The bridge already exists

`TealscriptManager` accepts `createWorker: () => Worker` as an injected option.
It does not care what produces the worker, only that the object honours
`postMessage` / `addEventListener` / `terminate`.

So hosting on mobile is **not** a matter of building a worker host. It is a
matter of supplying that factory with a WebView-backed object of the same
shape. The pattern is proven: a production React Native application already
runs it for a different workload, with a `Worker`-shaped client relaying
`postMessage` traffic across a WebView bridge into real WebWorkers spawned
inside the page.

What tealchart must add is the bundled page and the factory — not the protocol,
and not the transport pattern.

## Threading

`MobileIndicatorManager` documented itself as "Synchronous execution on main
thread (no WebWorkers)" and called the backend inline. That is React Native's
**JS thread**, not the native UI thread — native rendering, `useNativeDriver`
animations, `react-native-gesture-handler` and Reanimated worklets all survive
a long script. What stalls is everything routed through JS: incoming bars,
indicator recomputation, React state, timers.

Web solved this with a WebWorker. Mobile did not. The WebView restores the same
shape: the runtime is off the JS thread by construction, and no script can
stall a candle.

This holds regardless of how the eval question resolves. Running the runtime
inline on the JS thread is wrong even on an engine that evaluates generated
code perfectly.

## Loading contract

**Candles load instantly. Indicators load lazily. The two never block on each
other.**

- Candles: data feed → renderer. The WebView is not on this path.
- Indicators: WebView → renderer.

Rules:

1. **Start WebView initialization at launch, and never `await` it.** WebView
   creation is a native allocation (a separate content process on iOS), so it
   does not compete with the chart for JS-thread time. The two race
   independently and candles win because they have less to do.
2. **Never place an `await` between "runtime ready" and "draw candles."** That
   is the only coupling that can break the instant-candle guarantee.
3. Indicator requests queue against a readiness promise. By the time one is
   made the runtime is normally warm and the queue drains immediately.
4. **Reserve pane geometry from the saved layout at paint time.** A restored
   layout with sub-pane indicators must not create panes only when the
   indicator computes, or the chart visibly rearranges itself a few hundred
   milliseconds after paint. Lazy should look like loading, not like reflow.

## Bridge hazard: `na` is `NaN`, and JSON destroys it

A WebWorker uses structured clone, which preserves `NaN` and `undefined`. A
React Native WebView bridge is JSON strings, and `JSON.stringify(NaN)` is
`null`.

Pine relies on `na` constantly — every warmup period, every gap, every unset
series value — and `na` is represented as `NaN`. A value that reads `na` on web
would read `null` on mobile, and `null` coerces to `0` where `NaN` does not.
This is a silent wrong-numbers class, not a cosmetic quirk.

Note the full chain is `RN ⟷ JSON ⟷ WebView page ⟷ structured clone ⟷ Worker`,
so `NaN` survives the inner hop and dies only at the React Native boundary.
Encode explicitly there rather than trusting JSON.

The mobile-specific correctness surface is one bridge conformance check:
round-trip `NaN`, `undefined`, `Infinity`, `-0`, typed arrays and deeply nested
drawing arrays through the real bridge and assert they survive. Once mobile is
web, there is no need for a parallel mobile corpus.

## Open risk

Smaller than first assessed, and precisely characterised.

The concern was that `compiled` silently fell back to the interpreter under
realtime for stateful intrabar constructs — `varip`, collection mutation,
persistent collection mutation, history-with-intrabar state — affecting 45 of
246 corpus scripts, and that deleting the interpreter would strand them.

Measured after deletion: **all 45 pass compiled-only realtime replay across 37
events each.** The engine handles them. What refused them was a **safety gate in
the product worker**, not a capability gap. That gate is now removed; the worker
composite, external-corpus, and performance-composite realtime tests prove the
former fallback rows execute as compiled and match fresh compiled
reconstruction.

So the answer is not "teach compiled four construct classes." Inventory:
`packages/tealscript/reports/compiled-realtime-unsupported-inventory.md`.

This does not block the WebView host, which is the next implementation step.

## Sequence

1. ~~Delete the closure backend.~~ Done.
2. ~~Delete the compiled → interpreter realtime fallback.~~ Done; unsupported
   realtime constructs now fail loudly instead of degrading silently.
3. ~~Delete the interpreter.~~ Done.
4. ~~Build the bundled WebView host and the `createWorker` factory.~~ Done.
5. ~~Adjudicate and remove the product-worker realtime safety gate.~~ Done.
6. ~~Bridge conformance check.~~ Done.
7. On-device performance measurement — never yet taken. All existing timings are
   Node on a development machine.
