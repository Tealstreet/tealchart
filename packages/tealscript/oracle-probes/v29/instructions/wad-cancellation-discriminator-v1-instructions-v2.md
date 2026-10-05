# WAD cancellation discriminator v1

Capture the same TVC:DXY 2-minute feed as the v7 implicit-OBV/PVT/WAD capture, with enough history to include near-zero crossings. Preserve full CSV precision and explicit historical cutoff. Native values are UNSPECIFIED. Distinguish raw accumulated residuals from native zero normalization; the two reset thresholds are competing hypotheses, not authority. If both reset columns coincide, threshold remains held. Source is staged for i5qr9c v29 assembly; no bundle manifest written.


Precision gate: use TradingView Export chart data and inspect the unmodified CSV text for WAD, EXPLICIT_RAW, RESET_1E13 and RESET_1E10 at near-zero rows; retain those exact lines. Crosshair/Data Window screenshots corroborate rows but rounded displayed numbers are insufficient. Record any available chart/display precision setting without changing the source. Award threshold discrimination only when raw exported model cells actually differ at relevant rows. If export/display precision or the feed makes them coincident, mark threshold HELD-PRECISION/COINCIDENT; do not assume CSV rounding or normalize values.
