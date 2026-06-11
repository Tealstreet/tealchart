# AST Interpreter Performance — Status

One line per optimization, newest at bottom. Format:
`YYYY-MM-DD HH:MM | <what changed> | 2K: Xbps 5K: Xbps 10K: Xbps | notes`

---
<!-- iterations append below -->
2026-06-10 baseline | no changes | 2K: 4087bps 5K: 1731bps 10K: 755bps | O(n²) confirmed, 20K=267bps
2026-06-11 00:50 | PR #1008 skip snapshot + O(1) equity curve | 2K: 44476bps 5K: 44175bps 10K: 32365bps | O(n²) eliminated, 11-50x speedup
2026-06-11 01:05 | PR #1009 skip order scan when no pending | 2K: 48991bps 5K: 54231bps 10K: 53417bps | flat scaling achieved, +65% at 10K
2026-06-11 01:20 | profiling pass | 2K: ~49Kbps 5K: ~54Kbps 10K: ~53Kbps | stmts=53% strategy=43%
2026-06-11 07:30 | PR #1010 scope/call/strategy-guard opts | 2K: 57068bps 10K: 54505bps | single lookup, skip getMemberPath, strategy guard for indicators
2026-06-11 07:40 | PR #1012 cache source arg preservation | 2K: 59385bps 10K: 60743bps | +11% at 10K, cache per-call-site AST checks
2026-06-11 08:00 | exploration: callId cache, source bindings restructure, Series.getCurrent | no gains — V8 JIT already optimizes hot paths, WeakMap overhead exceeds savings
2026-06-11 10:30 | PRs #1020,#1023,#1025 Pine→JS transpiler (Epics 1-3) | compiled: 2K: 179Kbps 5K: 349Kbps 10K: 286Kbps 20K: 381Kbps | 7-10x speedup over interpreter, Float64Array ring buffers, stateful TA classes
2026-06-11 14:00 | Hoist barCtx, bypass ExecutionContext, cache plot arrays | compiled: 10K: 548Kbps 20K: 541Kbps | 14.7x speedup, 500K+ target achieved
