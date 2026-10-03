# Polyline source mutation outcome

Requires screenshot; no live ticks. Use at least160bars. Record whether thick red coincides with thin green (original coordinates), thin blue (mutated coordinates), disappears, or errors. Native outcome unobserved; CSV does not settle geometry.

```pine
//@version=6
indicator("Polyline point mutation outcome", max_polylines_count=3)
if barstate.islastconfirmedhistory
    first = chart.point.from_index(bar_index - 5, close)
    second = chart.point.from_index(bar_index, close + 1)
    points = array.from(first, second)
    polyline.new(points, line_color=color.red, line_width=5)
    polyline.new(array.from(chart.point.from_index(bar_index - 5, close), chart.point.from_index(bar_index, close + 1)), line_color=color.green, line_width=1)
    first.price := close + 10
    second.price := close + 11
    polyline.new(array.from(chart.point.from_index(bar_index - 5, close + 10), chart.point.from_index(bar_index, close + 11)), line_color=color.blue, line_width=1)
    array.clear(points)
plot(close, "READINESS_CLOSE")
```
