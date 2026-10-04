# Ledger 199 bgcolor discriminator v1

Use this complete unchanged v3 indicator. One source, two input settings; no strategy, library, pasted fragments, bar_index, or string-color conversion.

1. Record source SHA, TV compilation result and exact diagnostic code/text/location. An offset-specific refusal decides v3 admission; an unrelated diagnostic is an invalid attempt and must be corrected separately, not treated as offset evidence.
2. Standard candle chart, linear price scale, 1-minute or 2-minute bars, at least64 loaded bars. Add the indicator with Use series offset=true. Use Bar Replay, stopping when the last calculated N modulo16 is15. Record actual last-calculated N/time and the target study's actual native offset; do not infer the last offset from a CSV that omits the live row.
3. Retain the whole preceding16-bar cycle, visibly at least600px wide, both source impulses and all predicted destination candles inside the viewport. Read exported N/PHASE/SOURCE_CODE/CALL_OFFSET and save the exact CSV. Lock the vertical candle range if transparent helper plots widen autoscale; for bgcolor retain the indicator pane. No compressed one-pixel bar screenshots.
4. Save actual native background intervals/colors in this indicator pane plus source/destination timestamps and native chart-index coordinates. Export raw renderer data and a screenshot on the same chart/viewport. Numeric CSV alone cannot settle placement.
5. Set Use series offset=false WITHOUT changing source, replay cutoff or viewport. Confirm CALL_OFFSET=0, capture the same fields. The two controls must appear at phases2/5. Restore true and record again; this detects scale/capture/visibility mistakes.

Let B be the observed source N at the start of this complete cycle. At the specified cutoff, sources B+2 and B+5 both called offset+2; the latest call has offset-2.
- Final-offset mapping predicts destinations B+0 and B+3.
- Per-source mapping predicts B+4 and B+7.
- Zero-control predicts B+2 and B+5.
The destination sets are disjoint. Red then lime identifies both sources.
Translate N to actual timestamps/native indices using the exported controls; do not assume N equals a host viewport index. Compare only this interior complete cycle and retain all raw fields if neither model matches.

Decision: an exact offset CE settles admission refusal. RUNS plus final-offset positions supports the frozen consumer on this bounded stencil; per-source positions refute it. A third observed mapping refutes both predictions and establishes a separate bounded native rule. Raw internal TealScript arrays are not observable TV state. No all-integer-offset, realtime-timing or exact-glyph-pixel claim.
