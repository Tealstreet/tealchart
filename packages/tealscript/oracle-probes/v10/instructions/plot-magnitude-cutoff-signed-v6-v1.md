# Plot magnitude cutoff signed capture v1

Source `plot-magnitude-cutoff-signed-v6-v1.pine` SHA256 `864e406f04f713e7ecaa790d3090188b81239cb5c75abba13b1e76170d72d3b7`. Paste exact source bytes unchanged into TradingView Pine Editor, retaining Pine v6. No native cutoff or phase is predicted.

Reset to BINANCE:BTCUSDT, standard candles,2-minute timeframe,UTC. Record compiler/runtime outcomes, exact error code/location if refused, and screenshot. Do not edit the source to make it run.

If it runs, keep all plots enabled. Export Time plus all five plot columns and at least156 completed historical bars (six complete26-bar cycles). Record live-bar cutoff, chart settings and any input/Style changes. Preserve the raw CSV without rounding or replacing blanks.

Capture the plotted circles in the pane over one complete cycle, then crosshair/Data Window screenshots at case indices0/1,4/5,12/13,14/15,20/21 and22/23. Record whether each raw circle exists and whether the Data Window/CSV raw value is present independently. Blank CSV, blank readout and missing rendered glyph are different observations.

Case index modulo26 is the discriminator:

| Case indices (+/-) | Positive literal | Negative literal |
| --- | --- | --- |
|0/1|9.26e99|-9.26e99|
|2/3|9.269999e99|-9.269999e99|
|4/5|9.27e99|-9.27e99|
|6/7|9.270001e99|-9.270001e99|
|8/9|9.28e99|-9.28e99|
|10/11|9.5e99|-9.5e99|
|12/13|9.9e99|-9.9e99|
|14/15|9.99e99|-9.99e99|
|16/17|9.999e99|-9.999e99|
|18/19|9.999999e99|-9.999999e99|
|20/21|1.0e100 (exact source literal)|-1.0e100|
|22/23|1.000001e100|-1.000001e100|

Case24 supplies zero; case25 intentionally supplies NA. `Source is NA` distinguishes that explicit source hole from plot suppression of a finite value. `Magnitude scaled by1e99` carries a small control value; `Magnitude case index` and `Input bar index` identify each bar. All control plots use Data Window display and remain in CSV. Huge-value axis formatting or CSV digit truncation alone does not settle plot presence. This brackets cutoff behavior only for these values, plot style and version; it does not infer a universal numeric/storage threshold or symmetry without observed signs.


Save evidence under v10/captures/v10/ and record the source hash, attempt, observed phase, diagnostic text/location, chart context, history extent and limitations in v10/captures/v10/RESPONSE-v10.md.
