# Corpus5 challenge probes v1

- `corpus5-v5-local-request-v1.pine`: v5 direct local requests without dynamic_requests are documented compiler-invalid. Capture exact native phase.
- `corpus5-v5-float-highest-length-v1.pine`: On chart2 ratio7.5 is float; documented integer signature forbids implicit float-to-int cast. Preserve source/version.
- `corpus5-v5-float-percentile-length-v1.pine`: Literal2.5 is float; int length admission gap. Capture native compiler outcome.
- `corpus5-v6-history-price-offset-v1.pine`: Price-derived float offset source is compatibility negative test; separate index-kind/offset-limit diagnostic from autosizing.
- `corpus5-v6-dynamic-history600-v1.pine`: Current engine refuses offset501 although OHLC history ceiling10000. Record native sizing/outputs; minimum1200bars.
- `corpus5-v6-equal-lower-timeframe-v1.pine`: Current docs accept lower OR EQUAL chart timeframe; engine equal refuses. No invented native intrabar count.
- `corpus5-exp-price-overflow-v1.pine`: BTC exponent overflows local finite representation. Exact native overflow/missingness not specified; capture all OUTCOME values.

Chart BINANCE:BTCUSDT,2-minute,standard,UTC. Keep v5 sources as v5. Dynamic history600 requires1200bars; others100. Capture exact native diagnostic or full OUTCOME CSV. No source edits for success.
