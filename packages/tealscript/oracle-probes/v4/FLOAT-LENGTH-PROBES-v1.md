# V5 float-length probes v1

Eight isolated scripts test MACD fast/slow/signal lengths, EMA, SMA, WMA, highest and percentile-linear-interpolation length. Use the unchanged source on BINANCE:BTCUSDT /2-minute /standard /UTC, with at least500 historical bars.

Each script contains one fractional target and separate integer floor/ceiling controls. CSV includes the target, controls, input close and bar index; MACD exports all three tuple components. Compare mature target vectors with both controls to distinguish conversion behavior. Matching a control is evidence, not a predetermined outcome; ties, missingness or different values must be preserved.

Run every script separately. If compilation refuses the fractional target, record COMPILE-ERROR with exact diagnostic, line/column and screenshot; no CSV is expected. If it runs, export every specified column including startup/na values. Preserve runtime failures and their bar/time separately. Do not repair the fractional argument or coerce it with int() to obtain success. Native setup failures remain unresolved.

Sources and hashes are below; copy-ready source blocks are in [PROBES-v4.md](PROBES-v4.md). Follow [HANDOFF-v4.md](HANDOFF-v4.md). No v5 acceptance, truncation, rounding or refusal is predicted.

- [v5-float-length-macd-fastlen-v1.pine](v5-float-length-macd-fastlen-v1.pine) — SHA256 `2841fdc125295ac8f4bce5a45dbfc698c0c67092a8878b864651543cdeae5034`; columns: OUTCOME, TARGET_SIGNAL, TARGET_HIST, FLOOR_MACD, FLOOR_SIGNAL, FLOOR_HIST, CEIL_MACD, CEIL_SIGNAL, CEIL_HIST, INPUT_CLOSE, BAR_INDEX.

- [v5-float-length-macd-slowlen-v1.pine](v5-float-length-macd-slowlen-v1.pine) — SHA256 `949808fb14996aec6c0fb52c3f84905d831bbe442e669e0b952746c80523937f`; columns: OUTCOME, TARGET_SIGNAL, TARGET_HIST, FLOOR_MACD, FLOOR_SIGNAL, FLOOR_HIST, CEIL_MACD, CEIL_SIGNAL, CEIL_HIST, INPUT_CLOSE, BAR_INDEX.

- [v5-float-length-macd-siglen-v1.pine](v5-float-length-macd-siglen-v1.pine) — SHA256 `6240d8ed6b7bdb744b5b319acfdc313df9fdd4560cce6429b233465cd27846f1`; columns: OUTCOME, TARGET_SIGNAL, TARGET_HIST, FLOOR_MACD, FLOOR_SIGNAL, FLOOR_HIST, CEIL_MACD, CEIL_SIGNAL, CEIL_HIST, INPUT_CLOSE, BAR_INDEX.

- [v5-float-length-ema-v1.pine](v5-float-length-ema-v1.pine) — SHA256 `38e8fe9eab820a5f49edda4b69748d9a97eb03d0dbd6330cd3c992176b6e59e3`; columns: OUTCOME, FLOOR_CONTROL, CEIL_CONTROL, INPUT_CLOSE, BAR_INDEX.

- [v5-float-length-sma-v1.pine](v5-float-length-sma-v1.pine) — SHA256 `41f9bac020524cc448086b36650b140449132ba093ce84bf329105ab419a8fc4`; columns: OUTCOME, FLOOR_CONTROL, CEIL_CONTROL, INPUT_CLOSE, BAR_INDEX.

- [v5-float-length-wma-v1.pine](v5-float-length-wma-v1.pine) — SHA256 `ec12f1cbadc061f3793f8d7053376caadda714e44cb244421112f292ab73966f`; columns: OUTCOME, FLOOR_CONTROL, CEIL_CONTROL, INPUT_CLOSE, BAR_INDEX.

- [v5-float-length-highest-v1.pine](v5-float-length-highest-v1.pine) — SHA256 `0334f8d75fe02c908b52529c6cc47c039bf5393f122aacc5ac46c69245141f56`; columns: OUTCOME, FLOOR_CONTROL, CEIL_CONTROL, INPUT_CLOSE, BAR_INDEX.

- [v5-float-length-percentile-linear-interpolation-v1.pine](v5-float-length-percentile-linear-interpolation-v1.pine) — SHA256 `190cc35c041f595de1381eafd272d88f2f0ee92116d637241fcbbb0934ebf311`; columns: OUTCOME, FLOOR_CONTROL, CEIL_CONTROL, INPUT_CLOSE, BAR_INDEX.
