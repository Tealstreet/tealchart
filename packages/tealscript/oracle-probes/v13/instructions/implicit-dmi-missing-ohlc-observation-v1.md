# implicit-dmi-missing-ohlc-observation-v1

Observe DMI recurrence only if chart bars actually contain missing high/low/close.

One exact source per study. Export complete CSV and record chart context. For implicit OHLC cases, require at least one exported OHLC_MISSING=1 before treating missing-value behavior as observed; otherwise record UNOBSERVED.

Minimum history: 64 bars. Record acceptance or exact diagnostic, chart symbol/timeframe and full CSV. Expected phase and values: UNSPECIFIED; native outcome: UNOBSERVED.

Volume gaps, skipped timestamps and resampled output holes do not establish missing OHLC; zero OHLC_MISSING keeps HOLD.
