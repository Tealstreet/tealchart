# Corpus compile third: native admission witnesses v1

Two Pine v5 bare-polyline cast targets and one independently typed missing-ID control. Capture unchanged source on BINANCE:BTCUSDT, 2-minute standard candles, UTC. Preserve the source hash, complete compile/runtime diagnostics, first failure phase/bar, and CSV of all columns if admitted. Twenty historical bars suffice. An accepted control cannot certify its target.

All outcomes remain NATIVE-PENDING. Documentation predictions are not TradingView observations. Corpus IDs identify the source constructs; a minimal probe cannot certify the whole original script. The proposed 83-row split still awaits peer coordination.

## corpus-compile-third-v5-polyline-existing-id-cast-v1.pine

Pine v5; corpus v56:1433. Prediction: UNSPECIFIED; native outcome unobserved.

SHA256 `14be2fd85b121dabe14fe44fd2c70d3d42b86d79f83768956c23d61a0818359d`. Columns: TARGET_MISSING.

```pine
//@version=5
indicator("corpus-compile-third-v5-polyline-existing-id-cast-v1")
var points = array.new<chart.point>()
if barstate.isfirst
    array.push(points, chart.point.from_index(bar_index, close))
    array.push(points, chart.point.from_index(bar_index + 1, close + 1))
var id = polyline.new(points, line_color=color.red)
cast_id = polyline(id)
plot(na(cast_id) ? 1 : 0, "TARGET_MISSING")
```

## corpus-compile-third-v5-polyline-missing-id-cast-v1.pine

Pine v5; corpus v56:1433. Prediction: UNSPECIFIED; native outcome unobserved.

SHA256 `c0d5271b41c1c33d4a914a9b05e7e77bdadad2a14914c63a50c38452e69b36fb`. Columns: TARGET_MISSING.

```pine
//@version=5
indicator("corpus-compile-third-v5-polyline-missing-id-cast-v1")
missing_id = polyline(na)
plot(na(missing_id) ? 1 : 0, "TARGET_MISSING")
```

## corpus-compile-third-v5-polyline-typed-na-control-v1.pine

Pine v5; corpus v56:1433. Prediction: COMPILE-ACCEPT; native outcome unobserved.

SHA256 `a249bc44f77eb3a8e9dc40f193b361b5ad2314b9a5305dbb2ac5e1ef2e0a18a0`. Columns: TYPED_MISSING_CONTROL.

```pine
//@version=5
indicator("corpus-compile-third-v5-polyline-typed-na-control-v1")
var polyline missing_id = na
plot(na(missing_id) ? 1 : 0, "TYPED_MISSING_CONTROL")
```
