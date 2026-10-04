# TradingView capture handoff v3

Checkpoint at 2026-10-04 17:15 UTC. Supersedes continuation state in [handoff v2](CAPTURE-HANDOFF-v2.md). Raw native CSV, logs, diagnostics, screenshots and renderer receipts remain unchanged. No engine A/B run or baseline update was performed.

| Bundle | Primary source coverage | Response or frozen handoff |
|---|---:|---|
| Original through v8 | Retained as documented in v1 | [Handoff v1](CAPTURE-HANDOFF-v1.md) |
| v9 | 95/95; 113 attempts | [Response v26](v9/captures/v9/RESPONSE-v26.md) |
| v10 | 13/13 | [Response v12](v10/captures/v10/RESPONSE-v12.md) |
| v11 | 57/59; 92 attempts; selected outcomes 33 RUNS, 24 COMPILE-ERROR | [Response v18](v11/captures/v11/RESPONSE-v18.md) |
| v12 | 30 pending, manifest v6 | [Handoff](v12/HANDOFF-v12.md) |
| v13 | 40 pending, manifest v13 | [Handoff](v13/HANDOFF-v13.md) |
| v14 | 13 pending, manifest v5 | [Handoff](v14/HANDOFF-v14.md) |
| v15 | 37 pending, manifest v9 | [Handoff](v15/HANDOFF-v15.md) |
| v16 | 13 registered, manifest v5; reserves require deduplication | [Handoff v2](v16/HANDOFF-v16-v2.md) |

V11 primary coverage counts a source with a retained stable export or exact refusal; it does not certify every required context. Three EMA registrations reuse hash-verified original v6 acquisitions. The initial lifecycle collector failure remains an UNKNOWN acquisition attempt alongside later native RUNS attempts.

V11 now includes const/UDT and ternary refusals, stateful holes, native hline gradients, numeric array every/some refusals, matrix epsilon samples, sparse UDF history, tagged UDT sort, six legacy-offset refusals and their versioned controls, retention/eviction witnesses, native curved polyline pre-raster controls, and paired six-minute provider captures. The response links every source and context supplement. Preserve first errors without inferring masked operations. Corpus909 preserves both original CRCRLF bytes and Monaco's documented newline expansion.

The six-minute provider supplement retains 111 concurrent live observations across two six-minute boundaries, separate no-reload exports, and independent reloads. Direct-feed execution starts earlier than the requested contexts. Input date coverage is available, but native origin/index alignment remains a separate question. Provider volume corrections and developing values are retained; outputs remain held out.

Analyst captures include BTC as a negative context and native BATS:AAPL one-minute outside-session readings. The required eligible symbol after regular open and entitlement verification remain unobserved. Lifecycle captures include six grayscale backgrounds, RESET_DISPLAY enabled and reset, profiler enabled, a saved-configuration reload that returned profiler off, and a separate restoration. Native viewport events eventually refreshed the Pine endpoints; earlier stale API-only observations remain retained. Original background and profiler settings were restored before switching probes.

The requested-confirmation source runs and has 24,994 historical rows plus the original live row. Opening/subsequent/closing observations across a requested 15-minute boundary remain unobserved. Subsequent native readings stalled; native `prodata.tradingview.com` ping and WebSocket requests timed out. Closing a second uninitialized task tab, reloading the original page, and navigating the standard chart URL did not initialize the chart. Authenticated regular TradingView HTTP APIs responded. The exact console/network/UI receipts are linked from [confirmation context v1](v11/captures/v11/requested-confirmation-context-v1.json). This is an acquisition interruption, not a Pine refusal.

Continuation when TradingView data connectivity returns:

1. Restore BINANCE:BTCUSDT, standard two-minute candles, UTC, replay off. Reinstall the exact `requested-confirmation-pair-v1.pine` and retain a separate reset attempt. Capture clocked live Data Window/PNG observations across a 15-minute boundary. The frozen source exposes no literal bar_index plot, so required Pine index0 remains unobservable from this source.
2. Capture v11 plan indices57 and58: `provider-daily-counter-prefix-v5-v1.pine` on two minutes and `provider-daily-direct-feed-v5-v2.pine` on one day. Neither was installed during the interruption. Pair the complete daily prefix with the requested first_time and first_count; retain reset and next daily-boundary attempts separately. Do not initialize from OUTCOME3301 or substitute the older companion filename mentioned in the counter instructions.
3. Continue v12 through v16 using each canonical manifest and per-source instructions. Preserve duplicate CSV headers by occurrence and positional order. V14 and v13 include reuse requirements. V15 owns shipped quota and fractional-price probes. V16's five visual context variants are reserves: use v15 receipts first and do not paste reserves when those receipts suffice; its curve is an optional second stencil. HTF6/10/30 require paired native feeds and developing, closed and reloaded receipts. Source/checksum files for v12–v16 were verified unchanged at this checkpoint.

For A/B, select a stable attempt, verify the response integrity receipt, retain decimal strings and blanks, and exclude the recorded live timestamp. Native browser indices and CSV row positions are not Pine indices. Every missing origin, entitlement, event, position or provider input remains explicitly unobserved. Read the context supplements before treating any exported vector as a replay input.

Previously pushed analyst/lifecycle receipts are in `b727110d59`; synchronized six-minute receipts are in `27d145533f`. This checkpoint adds the confirmation export, acquisition interruption receipts and response v18.
