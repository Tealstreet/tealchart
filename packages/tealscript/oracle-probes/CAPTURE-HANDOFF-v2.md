# TradingView capture handoff v2

Checkpoint on 2026-10-04; supersedes the continuation state in [handoff v1](CAPTURE-HANDOFF-v1.md). Earlier raw receipts and replies remain retained. This task captures native TradingView evidence only; no engine A/B execution or baseline changes were made.

| Bundle | Source coverage | Response |
|---|---:|---|
| Original through v8 | Primary coverage retained as documented in v1 | [Handoff v1](CAPTURE-HANDOFF-v1.md) |
| v9 | 95/95; 113 attempts; 77 RUNS, 14 COMPILE-ERROR, three RUNTIME-ERROR, one RUNS-PARTIAL-HISTORY | [Response v26](v9/captures/v9/RESPONSE-v26.md) |
| v10 | 13/13; six RUNS, seven COMPILE-ERROR | [Response v12](v10/captures/v10/RESPONSE-v12.md) |
| v11 | 10/59; six RUNS including three verified v6 reuses, four COMPILE-ERROR | [Response v11](v11/captures/v11/RESPONSE-v11.md) |
| v12 | 30 pending | [Handoff](v12/HANDOFF-v12.md) |
| v13 | 40 pending | [Handoff](v13/HANDOFF-v13.md) |
| v14 | 13 pending | [Handoff](v14/HANDOFF-v14.md) |
| v15 | 37 pending | [Handoff](v15/HANDOFF-v15.md) |

V9 now includes Pivot Candles interval companions, exact corpus diagnostics, financial and footprint contexts, all 48 precision sources, archived regression endpoint receipts, Granger provider companions and the remaining lexical/array cases. All 240 precision witness rows have MATCH=1 and EQ=1 with nonzero amplified residuals; this does not prove binary identity. Twenty captures differ from the archived input after their witness range because of a later provider volume correction. Read the precision input context v2 before comparing history. The financial daily AAPL receipt remains below its frozen minimum; Granger's numeric output ends before the BTC host tail. Companion histories do not expose TradingView's internal requested execution origin or postmerge series.

V10 admits both tuple-request sources, including the 128 aggregate discriminator. Independent one-minute history begins later than the parent dataset, so complete requested prefix parity remains unproved. The magnitude and NVI receipts preserve blank raw cells with finite scaled values and NA flags0; original NVI line plots bridge missing vertices. The exact framework report contains 57 passing, two deliberately failing and two skipped tests, with an unclipped native PNG. Bool/box/polyline sorting and allocation probes retain their first compile refusals; those refusals cannot settle later masked operations.

V11's const polyline declaration runs. Polyline reassignment, point field mutation and point reassignment return CE10085; const UDT returns CE10260, whose native location markers cover the source rather than identifying a precise statement. The ordinary UDT control runs. Three unchanged EMA registrations reference their original verified v6 acquisitions, without changing acquisition dates or identities. The exact full corpus909 source runs over 24,000 completed bars. Its original CRCRLF bytes are frozen; Monaco expanded each CRCRLF to two CRLF line breaks. The retained editor buffer and normalization receipt record this explicitly. This source has no literal plotted Pine index0, so its execution origin remains unexposed.

Continuation: v11 zero-based plan index10, `ternary-int-string-v6-v1.pine`, followed by the remaining 49 v11 registrations and v12–v15. Chrome is on BINANCE:BTCUSDT, two-minute standard candles, UTC, replay off, with corpus909. Capture work continues after this checkpoint.

For A/B work, read the frozen per-source instructions, select a stable attempt and verify its hashes. Keep raw CSV decimal strings, blanks, duplicate headers and positional order. Exclude each attempt's live timestamp. Reused files intentionally point to earlier bundles. Native chart indices and CSV row positions do not certify Pine indices. Preserve exact first diagnostics and unknown locations/times; do not repair sources or infer later operations from an earlier refusal. Context supplements linked from each response state provider, rendering, history and lifecycle limits.

Pushed evidence through v9 response v26 is `e77da08e8c`; v10 response v12 is `c9937dc91d`. This checkpoint adds v11 response v11 and the updated handoff.
