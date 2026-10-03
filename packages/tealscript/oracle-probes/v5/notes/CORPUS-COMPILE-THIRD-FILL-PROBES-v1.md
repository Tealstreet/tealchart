# Corpus compile third: native admission witnesses v1

Four independent Pine v5 fill binding discriminators; preserve both plot columns and the fill appearance if admitted. Capture unchanged source on BINANCE:BTCUSDT, 2-minute standard candles, UTC. Preserve the source hash, complete compile/runtime diagnostics, first failure phase/bar, and CSV of all columns if admitted. Twenty historical bars suffice. An accepted control cannot certify its target.

All outcomes remain NATIVE-PENDING. Existing shared visual root belongs to codex-uk9554; production edits are deferred to that owner. Documentation predictions are not TradingView observations. Corpus IDs identify the source constructs; a minimal probe cannot certify the whole original script. The proposed 83-row split still awaits peer coordination.

## corpus-compile-third-v5-fill-positional-title-named-transp-v1.pine

Pine v5; corpus v56:1383, v56:1450. Prediction: UNSPECIFIED; native outcome unobserved.

SHA256 `7b37a2b022153916638e32327b52953b512b6ab4ef11501cda80d1934c93fa4a`. Columns: UPPER, LOWER.

```pine
//@version=5
indicator("corpus-compile-third-v5-fill-positional-title-named-transp-v1")
p1 = plot(close, "UPPER")
p2 = plot(close - 1, "LOWER")
fill(p1, p2, color.green, "Fill", transp=80)
```

## corpus-compile-third-v5-fill-modern-title-control-v1.pine

Pine v5; corpus v56:1383, v56:1450. Prediction: COMPILE-ACCEPT; native outcome unobserved.

SHA256 `8e2d7e4aa8ee8394aad3b4329a16139ee43717ced257118c37777f2943d278c3`. Columns: UPPER, LOWER.

```pine
//@version=5
indicator("corpus-compile-third-v5-fill-modern-title-control-v1")
p1 = plot(close, "UPPER")
p2 = plot(close - 1, "LOWER")
fill(p1, p2, color.green, "Fill")
```

## corpus-compile-third-v5-fill-named-title-transp-control-v1.pine

Pine v5; corpus v56:1383, v56:1450. Prediction: UNSPECIFIED; native outcome unobserved.

SHA256 `127b6195e40b0656a7d0f377bf292bff6b3e343b7e338b126b5abeb16ce0f519`. Columns: UPPER, LOWER.

```pine
//@version=5
indicator("corpus-compile-third-v5-fill-named-title-transp-control-v1")
p1 = plot(close, "UPPER")
p2 = plot(close - 1, "LOWER")
fill(p1, p2, color.green, title="Fill", transp=80)
```

## corpus-compile-third-v5-fill-positional-transp-named-title-v1.pine

Pine v5; corpus v56:1383, v56:1450. Prediction: UNSPECIFIED; native outcome unobserved.

SHA256 `736e2369f4f6a0e8b45c21be4efe1f91ba90a88ea39a5b461206928d38f25628`. Columns: UPPER, LOWER.

```pine
//@version=5
indicator("corpus-compile-third-v5-fill-positional-transp-named-title-v1")
p1 = plot(close, "UPPER")
p2 = plot(close - 1, "LOWER")
fill(p1, p2, color.green, 80, title="Fill")
```
