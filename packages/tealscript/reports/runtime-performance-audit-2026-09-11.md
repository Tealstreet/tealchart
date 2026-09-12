# Runtime Performance Audit - 2026-09-11

Scope: dense compiled execution, point-data/request execution, and a new
strategy-heavy ledger composite after the runtime honesty work added TA length
validation, Pine runtime error classification at catch boundaries, runtime
approximation recording, and the approximation surface guard.

## Measurements

Command:

```sh
TEALSCRIPT_PERF_ASSERT=1 TEALSCRIPT_PERF_LOG=1 yarn workspace @tealstreet/tealscript vitest run tests/compat/pine-composite-performance.test.ts --reporter verbose
```

Measured on Sam's local macOS Apple Silicon shared agent machine.

| Case | Committed baseline | Measured | Envelope |
| --- | ---: | ---: | ---: |
| Dense compiled path | 281 us/bar | 126.8 us/bar | 500 us/bar |
| Request fanout path | 184 us/bar | 160.1 us/bar | 350 us/bar |
| Strategy ledger path | 1021 us/bar, added by this audit | 583.4 us/bar | 1900 us/bar compiled, 4000 us/bar reference |

The earlier committed dense and request baselines remain inside their envelopes.
Dense and request measured faster than their committed baselines, so neither
path shows a material throughput loss from the honesty work. The strategy-heavy
path had no committed throughput baseline; this audit adds one from the heavier
first assertion run (1020.5 us/bar) with a threshold that would fail a 2x
compiled-execution slowdown.

## Gate Verdict

`pine-composite-performance.test.ts` already had a performance gate, but it was
opt-in via `TEALSCRIPT_PERF_ASSERT=1`. The default Vitest run, CI's `yarn
test:ci`, and CI's TealScript semantic sweep all executed only smoke coverage;
no workflow or scheduled job was found that set the assertion flag. Before this
audit, the gate covered dense, drawing, and request composites, and did not
include a strategy-heavy ledger script. It also allowed a 2x slowdown on the
dense and request compiled paths.

This audit adds the strategy-heavy composite and tightens the dense/request
compiled thresholds so the gate catches a 2x regression. A trial run with all
timing assertions default-on failed on the strategy public-wrapper/reference
timing (`3286.8 us/bar` against an `1800 us/bar` envelope) and took 78s for the
file, while the dense/request compiled thresholds had already passed. A second
trial showed the strategy compiled path can spike to `1579.3 us/bar` under the
same loaded local conditions, so its compiled envelope is `1900 us/bar`: wide
enough for contention, still below a 2x regression from the conservative `1021
us/bar` baseline.

The standard package Vitest suite is not a stable place to run the throughput
assertions: under full-suite contention, dense/request/strategy compiled timing
spiked to `874.5`, `1317.9`, and `3514.3 us/bar`. The correct pull point is an
isolated CI step. CI now runs `TEALSCRIPT_PERF_ASSERT=1 TEALSCRIPT_PERF_LOG=1
yarn vitest run packages/tealscript/tests/compat/pine-composite-performance.test.ts`
as a separate gate. Use the same command locally when the question is throughput
details.

Verification after default-on compiled assertions:

- Default performance file without assertions: smoke/fallback checks only.
- Full profiling mode (`TEALSCRIPT_PERF_ASSERT=1 TEALSCRIPT_PERF_LOG=1`): 8
  passed, 1 skipped, 25.66s.
