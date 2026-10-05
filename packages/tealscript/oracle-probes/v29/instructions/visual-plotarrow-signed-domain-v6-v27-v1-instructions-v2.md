# visual-plotarrow-signed-domain-v6-v27-v1 observation instructions v1

Use exact v6 source on BINANCE:BTCUSDT 2-minute standard candles, UTC, at least192 loaded bars. Freeze the dataset and record symbol, cutoff, first/last BAR_INDEX, chart scale mode, pane height, original screenshot pixel dimensions and display scaling if known. Native renderer offsets are UNAVAILABLE-VIA-UI.

1. Compile and retain any exact compiler/runtime diagnostic. If it runs, export raw CSV. Choose one64-bar block B verified by SOURCE_INDEX_MOD64. The source contains+2,+8,-3,-30, oneNA, zeros, and a remote+500 at B+60.
2. Keep the same observed source event B+12 visible in three views: [B,B+40] (outlier excluded), [B,B+63] (outlier included), then [B,B+40] again. Capture all three original-resolution screenshots for BASE, SCALED, SIGN_FLIPPED and SHOW_LAST32. Use the crosshair/Data Window and visible time axis to identify source bars; measure arrow heights in screenshot pixels with unchanged display scaling. Retain the visible viewport bounds. Native item height/origHeight, padded item sets and CSS/device-pixel conversion are UNAVAILABLE-VIA-UI unless a separately authenticated instrument exists; no internal-normalization credit follows from screenshots.
3. Compare BASE and SCALED heights for corresponding source bars (the latter shifted+1). Does positive scaling leave pixel heights equal? Compare BASE and SIGN_FLIPPED (shift+2). Do unequal positive/negative groups share an absolute normalization range, or does changing sign affect the corresponding heights? Record measurements rather than choosing a formula.
4. For SHOW_LAST32 (shift+3), inspect the latest32 source bars and identify exactly which arrows remain drawn. Find an earlier+500 outside that window but inside the visible range if possible; compare its influence on BASE versus SHOW_LAST32. The normalization range and show_last visibility are separate observations.
5. Capture B+36 NA and the adjacent zero-valued source bars; retain whether arrows are absent and do not treat a missing item as a measured zero-height arrow. If a desired earlier view contains no SHOW_LAST32 items, report that, then capture a latest block with matching source rows.

Existing v5 capture of trace-plotarrow-normalization-domain-v6 is reused: its bounded viewport normalization method and paired observations must not be discarded. The new question is the composed unequal-sign/scale/per-call-show_last behavior. CSV values prove source identity and masks only, never pixel normalization. No universal min/max equation or sign policy is predicted from the current engine.

Source SHA256: `226d13f287c95cefcd617dd1cd07cd2c220b5894b18e2bc748d2cbea0a6fe947`.

Native compile phase, runtime outcome, values and rendering are UNSPECIFIED. Preserve the version and source exactly. Capture a refusal verbatim with code, message and source span; an unrelated failure does not settle the visual question.
