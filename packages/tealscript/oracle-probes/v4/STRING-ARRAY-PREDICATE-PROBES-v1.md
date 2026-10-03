# String-array predicate outcome probes v1

Eight independent probes cover `array.every` and `array.some` on `["", "alpha"]`, with namespace and receiver forms in v5 and v6. Copy each complete source from [PROBES-v4.md](PROBES-v4.md); follow [HANDOFF-v4.md](HANDOFF-v4.md). Use BINANCE:BTCUSDT /2-minute /standard candles /UTC and at least3 historical bars.

Admission and results are unobserved. CF003 v6 numeric-array refusals do not settle strings or earlier versions. Capture each exact native phase independently, including complete diagnostic text/code if exposed, line/column, screenshot and bar/time. Never change the source to obtain success.

If accepted, export the untouched OUTCOME CSV with missingness. The plot encodes true as1, false as0 and neither equality condition as-1; the latter preserves a possible v5 missing bool without introducing the invalid v6 `na(bool)` helper. Unexpected outputs remain evidence. A line5 output-instrument error cannot be called a line4 predicate refusal. One member/form/version does not settle the others, and this mixed input does not settle empty/all-na arrays or other strings.

These are source-pinned outcome requests, not expected-red engine regression tests. Local parse/check/compiled runs are instrument checks only; native status stays NOT-CAPTURED.

Sources:

- [trace-array-string-every-namespace-v5.pine](trace-array-string-every-namespace-v5.pine) — SHA256 `c0f15c335cbb00065cad68413236892171affb5d5186471612a07b3161fe2a91`.
- [trace-array-string-every-receiver-v5.pine](trace-array-string-every-receiver-v5.pine) — SHA256 `0315a57585011d2d4dea5f84dbf8f1714b24b72f87cf51fa97c286338821eebb`.
- [trace-array-string-some-namespace-v5.pine](trace-array-string-some-namespace-v5.pine) — SHA256 `f05311d1ae976076d790dd71b4bc74e8065217322cd0b2edfab5e9b826a71651`.
- [trace-array-string-some-receiver-v5.pine](trace-array-string-some-receiver-v5.pine) — SHA256 `0af919315b1604529f917d7662f9ae873b40068657aaf4fcd1af10f612502af2`.
- [trace-array-string-every-namespace-v6.pine](trace-array-string-every-namespace-v6.pine) — SHA256 `0554a7d9d5f457a978e780cb8dc7cbb2f2aad99e1882651819014bc29fc9ad2f`.
- [trace-array-string-every-receiver-v6.pine](trace-array-string-every-receiver-v6.pine) — SHA256 `52b733435c34698d0bffc8ba6be3203e754f1398cbf48e8c332dd4eb388baa20`.
- [trace-array-string-some-namespace-v6.pine](trace-array-string-some-namespace-v6.pine) — SHA256 `8f68f60685b971765d762b8f90a7852d5bab24423a767e67c74a1bb9ad6b49ef`.
- [trace-array-string-some-receiver-v6.pine](trace-array-string-some-receiver-v6.pine) — SHA256 `d9a28d74b2e0ac4961bc280d26165cb7d1f4a8d62e0b0e640bb11038d5240028`.
