# Gaps 6 unresolved-row capture map

These sources cover ledger gap ranks 202, 222, 223, 227, 238 and the separate rank 240 initializer conflict identified by independent verification. All predictions remain unobserved. Use the shared [capture handoff](HANDOFF-v3.md) and [copy-ready sources](PROBES-v3.md), with the source hashes in the two bundle JSONs. Existing probes are reused without source changes.

| Rank | Ledger row | Source | Required discriminator |
| ---: | --- | --- | --- |
| 202 | collections-v1#126 | [literal missing index](array-02-get-index-literal-na.pine), [math.round missing index](array-03-get-index-math-round-na.pine) | Exact native phase/diagnostic or array element/missing output. A math.round refusal does not establish array.get behavior. |
| 222 | version-rules-v1#280 | [v3 series offset](plot-01-series-offset-v3.pine), [v4 series offset](plot-02-series-offset-v4.pine) | Native acceptance/refusal plus timestamp/price placement screenshots across offset signs and updates. CSV alone cannot establish displacement. |
| 223 | input-string-math-color-v1#738 | [default precision](strings-01-tostring-default-precision.pine) | Exact THIRD text distinguishes eight from ten places; PRICE is a rounding control. |
| 227 | input-string-math-color-v1#758 | [eleven-digit rounding](strings-03-tostring-eleven-decimal-rounding.pine) | Exact POSITIVE/NEGATIVE strings for 1.12345678901 and its negative. Eight-place predictions are ±1.12345679; ten-place predictions are ±1.123456789. |
| 238 | language-grammar-v1#156 | [unmatched string if](conditional-01-unmatched-string-if.pine) | OUTCOME 1 = missing string, 2 = defined empty string, 3 = another defined string; exact RESULT table/log text corroborates it. |
| 240 | series-history-na-v3#282 | [string na initializer](strings-04-na-initializer.pine) | OUTCOME 1 = missing text, 2 = defined empty text, 3 = another defined string; exact INITIALIZER log/table text corroborates it. |

The frozen grammar ledger records an empty-string default. The current [Conditional structures page](https://www.tradingview.com/pine-script-docs/language/conditional-structures/), checked 2026-10-03, describes na for unmatched non-bool returns. This is an authority conflict until native capture, rather than a reason to choose an engine result. Numeric formatting claims likewise retain the archived individual-reference versus Strings-manual disagreement.

Sources and hashes are staging artifacts, not new TradingView captures. Preserve native outcomes even when neither prediction matches. Do not edit rejected sources to get an export.
