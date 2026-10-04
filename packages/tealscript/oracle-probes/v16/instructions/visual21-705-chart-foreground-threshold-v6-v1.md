# Ledger705 foreground threshold discriminator v1

Paste the complete unchanged v6 indicator. It exports numeric channels, never str.tostring(color). Use a standard chart with at least16 closed bars, background mode Solid; retain chart theme and background-setting screenshots.

1. Record exact compilation code/text if refused. The earlier capture failed on unrelated color-to-string conversion; this source eliminates that call.
2. Under the SAME chart theme/symbol/timeframe, apply exact solid backgrounds #000000, #FFFFFF, #7F7F7F and #808080, one at a time. Wait for recalculation and export all BG_R/G/B and FG_R/G/B/T; record source SHA, requested background, theme, UTC, actual exported background channels and settings screenshot for each run.
3. Reject an attempt as a setting/instrument mismatch if BG channels do not equal the requested hex, a gradient remains active, theme changes, or the script did not recalculate. Do not silently substitute the requested color for actual channels.
4. The frozen rule predicts foreground219/219/219 at #000000 and #7F7F7F,15/15/15 at #FFFFFF and #808080; transparency0 throughout. The neighboring gray samples discriminate the current strict brightness<128 boundary from <=128 and theme-only foreground selection.
5. If the gray boundary differs, reuse THIS SAME source for binary search of Solid gray0..255 until two adjacent grayscale settings bracket the switch, retaining every attempted setting/export. No additional Pine source needed. Record non-binary foreground channels or no switch exactly, rather than forcing a two-palette assumption.

Decision: exact channels at both adjacent127/128 plus endpoint controls support this bounded gray threshold. Any finite mismatch directly refutes the current rule; a different adjacent bracket pins a replacement boundary for this host/theme. No global RGB luminance formula, gradient interpolation or all-theme policy is certified by a grayscale bracket.
