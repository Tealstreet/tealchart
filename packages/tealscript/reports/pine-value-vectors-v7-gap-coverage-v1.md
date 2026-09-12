# Pine Value Vectors V7 Gap Coverage V1

Source audit: `external-pine-corpus-v7.current-gap-pool-bbcbf3d220-v1.md`.

## Summary

- V7 real-gap rows covered: `19/19`.
- Root-cause vectors added or verified: `8`.
- Current green vectors: `5`.
- Current expected-red vectors: `3`.
- Member breadth movement: `0`; the v7 rows hit members already present in the map, but lacked root-cause vectors.

## Root-Cause Coverage

| V7 rows | Construct | Vector case | State |
| --- | --- | --- | --- |
| `0008` | Global visible output after collection calls | `array.receiver-result-chain-values` | green |
| `0023` | Array math receiver result loses length or contents | `array.receiver-result-chain-values` | green |
| `0078`, `0079`, `0080` | Switch arm arrow after continuation line | `language.switch-arm-arrow-continuation-values` | expected-red |
| `0101`, `0102` | Enum members with display strings | `language.enum-display-string-values` | green |
| `0115`, `0116` | Tuple declaration inside switch arms | `language.switch-arm-tuple-local-values` | green |
| `0141`, `0142`, `0143`, `0144`, `0145`, `0146`, `0160` | Matrix eigenvalues/eigenvectors with complex roots | `matrix.complex-eigen-shape-values` | green |
| `0153` | Mixed int/float `matrix.kron()` return type | `matrix.mixed-kron-values` | green |
| `0249` | Two-argument `ticker.kagi()` overload | `ticker.kagi-two-argument-values` | expected-red |
| `0253` | Tuple declaration with `=` on following continuation line | `language.tuple-continuation-equals-values` | expected-red |

## Oracle Notes

- Array receiver-result vectors derive from TradingView v5 array docs: `array.abs()` maps numeric elements to absolute values, `array.copy()` preserves array contents, and receiver methods are equivalent to namespace calls.
- Enum display-string vectors derive from TradingView v6 enum docs: display strings are UI titles, while enum identity remains the member.
- Switch and tuple vectors derive from TradingView conditional-structure and tuple-declaration docs: selected switch arms return their final local-block expression, and tuple declarations preserve element positions.
- `matrix.mixed-kron-values` derives from the Kronecker product definition and Pine numeric type compatibility.
- `matrix.complex-eigen-shape-values` asserts only documented output shape, not exact complex-value representation.
- `ticker.kagi-two-argument-values` asserts the ticker identifier structure needed by request routing, not provider-returned Kagi OHLC values.
