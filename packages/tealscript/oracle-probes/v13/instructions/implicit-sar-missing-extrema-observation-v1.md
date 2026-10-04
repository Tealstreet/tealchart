# implicit-sar-missing-extrema-observation-v1

Observe SAR recurrence only on a chart with actual missing extrema.

One exact source per study. Export complete CSV and record chart context. For implicit OHLC cases, require at least one exported OHLC_MISSING=1 before treating missing-value behavior as observed; otherwise record UNOBSERVED.

Minimum history: 64 bars. Record acceptance or exact diagnostic, chart symbol/timeframe and full CSV. Expected phase and values: UNSPECIFIED; native outcome: UNOBSERVED.

A dataset without missing OHLC cannot settle missing-extrema recurrence; output holes and volume-only gaps do not substitute.
