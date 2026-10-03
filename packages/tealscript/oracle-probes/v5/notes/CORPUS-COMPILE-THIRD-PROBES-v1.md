# Corpus compile third: native admission witnesses v1

Seven target scripts and three independent controls. Capture unchanged source on BINANCE:BTCUSDT, 2-minute standard candles, UTC. Preserve the source hash, complete compile/runtime diagnostics, first failure phase/bar, and CSV of all columns if admitted. Twenty historical bars suffice. An accepted control cannot certify its target.

All outcomes remain NATIVE-PENDING. Documentation predictions are not TradingView observations. Corpus IDs identify the source constructs; a minimal probe cannot certify the whole original script. The proposed 83-row split still awaits peer coordination.

## corpus-compile-third-v6-color-linewidth-v1.pine

Pine v6; corpus v56:69, v56:86, v56:256, v56:262, v56:263, v56:264, v56:268, v56:269, v56:270, v56:272, v56:274, v56:278, v56:380, v56:381, v56:383, v56:739. Prediction: COMPILE-REJECT; native outcome unobserved.

SHA256 `6e4574a1ae16ffdd28029c4cc7400b0e950483927b996684000cb87794fd8522`. Columns: TARGET.

```pine
//@version=6
indicator("corpus-compile-third-v6-color-linewidth-v1")
plot(close, "TARGET", color=color.new(color.red, 80, linewidth=2))
```

## corpus-compile-third-v6-duplicate-plot-color-v1.pine

Pine v6; corpus v56:157, v56:175, v56:177, v56:253, v56:257, v56:724. Prediction: COMPILE-REJECT; native outcome unobserved.

SHA256 `1fb9bd0f467011415066faf5fef14daf1d881daba9a4bf3f7526c3d5fb570c08`. Columns: TARGET.

```pine
//@version=6
indicator("corpus-compile-third-v6-duplicate-plot-color-v1")
plot(close, "TARGET", color.blue, color=color.yellow, linewidth=2)
```

## corpus-compile-third-v6-forward-global-v1.pine

Pine v6; corpus v7:382, v56:494. Prediction: COMPILE-REJECT; native outcome unobserved.

SHA256 `05645b64f7e8c91d2fbef3e6b1da19d323914127bf537ac5980be8e44f825326`. Columns: TARGET.

```pine
//@version=6
indicator("corpus-compile-third-v6-forward-global-v1")
readGlobal() => wActifLvl
wActifLvl = close
plot(readGlobal(), "TARGET")
```

## corpus-compile-third-v6-undeclared-global-v1.pine

Pine v6; corpus v56:580. Prediction: COMPILE-REJECT; native outcome unobserved.

SHA256 `b1e319d2214f4fa0bedca748e46ed20744c489ff6cc9933e3ac3076b005fc60a`. Columns: TARGET.

```pine
//@version=6
indicator("corpus-compile-third-v6-undeclared-global-v1")
plot(relVol, "TARGET")
```

## corpus-compile-third-v6-leading-comma-declaration-v1.pine

Pine v6; corpus v7:122. Prediction: UNSPECIFIED; native outcome unobserved.

SHA256 `3a00966b52082a5ab6821304a05bdb6f324774efd94d774c03b15a57fda288c0`. Columns: TARGET.

```pine
//@version=6
indicator("corpus-compile-third-v6-leading-comma-declaration-v1")
  , INV=color(na)
plot(close, "TARGET")
```

## corpus-compile-third-v5-comma-imports-v1.pine

Pine v5; corpus v7:180. Prediction: UNSPECIFIED; native outcome unobserved.

SHA256 `8c0c2ad05d2ef21f829a80d83dd889410979e5ed6b8261e95d943c4fa9dee311`. Columns: TARGET.

```pine
//@version=5
indicator("corpus-compile-third-v5-comma-imports-v1")
import TradingView/ta/7 as tvta, import PineCoders/Time/3 as pct
plot(close, "TARGET")
```

## corpus-compile-third-v5-fullwidth-comment-layout-v1.pine

Pine v5; corpus v56:1460, v56:1561. Prediction: UNSPECIFIED; native outcome unobserved.

SHA256 `5446685af1e58e9eb41bb2cf1289e3378c2371e1f01a8ca5c050982df43616b8`. Columns: TARGET.

```pine
//@version=5
indicator("corpus-compile-third-v5-fullwidth-comment-layout-v1")
    　　// Full-width spaces before a comment, matching the corpus construct.
plot(close, "TARGET")
```

## corpus-compile-third-v5-ascii-comment-control-v1.pine

Pine v5; corpus v56:1460, v56:1561. Prediction: COMPILE-ACCEPT; native outcome unobserved.

SHA256 `a6175aa9b22381c5d1cd0074501e35acc3d2c410b92c93dedaa869a3f112552d`. Columns: PRICE_CONTROL, STRING_LENGTH_CONTROL.

```pine
//@version=5
indicator("corpus-compile-third-v5-ascii-comment-control-v1")
    // ASCII layout control; literal and trailing comment retain U+3000.
text = " 　  " //　corpus string/comment control
plot(close, "PRICE_CONTROL")
plot(str.length(text), "STRING_LENGTH_CONTROL")
```

## corpus-compile-third-v6-name-binding-controls-v1.pine

Pine v6; corpus v7:382, v56:494, v56:580. Prediction: COMPILE-ACCEPT; native outcome unobserved.

SHA256 `fe6e581e1981d20b3567856d2e0021f025744663321148eb37cbd277bd843756`. Columns: EARLIER_GLOBAL_CONTROL, DECLARED_VALUE_CONTROL, COLOR_CONTROL, SINGLE_COLOR_CONTROL.

```pine
//@version=6
indicator("corpus-compile-third-v6-name-binding-controls-v1")
wActifLvl = close
readGlobal() => wActifLvl
relVol = close
plot(readGlobal(), "EARLIER_GLOBAL_CONTROL")
plot(relVol, "DECLARED_VALUE_CONTROL")
plot(close, "COLOR_CONTROL", color=color.new(color.red, 80), linewidth=2)
plot(close, "SINGLE_COLOR_CONTROL", color.blue, linewidth=2)
```

## corpus-compile-third-v5-separate-import-controls-v1.pine

Pine v5; corpus v7:180. Prediction: COMPILE-ACCEPT; native outcome unobserved.

SHA256 `3960bb61afaf44ef108a5952e899a2d030a9bd9f2f166cebb62119483c8db1d6`. Columns: TARGET.

```pine
//@version=5
indicator("corpus-compile-third-v5-separate-import-controls-v1")
import TradingView/ta/7 as tvta
import PineCoders/Time/3 as pct
plot(close, "TARGET")
```
