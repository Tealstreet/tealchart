# Context acquisition v1

Full historical execution prefix and realtime-transition OHLC/update metadata missing; native bar20001 requested151 beyond buffer101 refusal is already observed.

Use unchanged source on BTCUSDT2m with fixed dataset. Export complete historical time/OHLC before applying and record dataset start/end/count. Retain exact error, line/bar/time and first realtime transition. Record attach-before-opening or midbar. Obtain matching bar_index/time/close/history/realtime prefix controls using a separate hash-bound auxiliary control if needed. A screenshot alone is insufficient. Do not change max_bars_back or offset.

Expected phase/values: UNSPECIFIED for supplemental facets. Existing observations remain separate; no universal closure.
