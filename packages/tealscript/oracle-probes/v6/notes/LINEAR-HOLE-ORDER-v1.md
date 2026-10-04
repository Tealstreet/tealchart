# Linear interior-hole order discriminators

Four standalone Pine v6 scripts: increasing/decreasing deterministic source, each atlength4 and14 with two interior holes every64bars. Each has exactly one written percentile call; source vectors repeat independently of chart prices.

Use BINANCE:BTCUSDT standard2minute candles UTC. Reload each script and export all seven columns beginning at input_bar_index0, at least256 confirmed historical rows. Retain source/CSV hashes, setup screenshots, exact timestamps and all blank cells; exclude the final live bar. Preserve complete diagnostic/error-bar evidence if refused.

The question is the finite/missing vector during each hole and its recovery, including the first all-finite window after both holes age out. Compare increasing and decreasing stimuli and lengths4/14. No native prediction is supplied. Current local output is instrument evidence only.

Existing shipped v5 hole probes remain unchanged. These new sources add monotonic source-order discrimination, and are not a modification to a frozen capture bundle or manifest.

Packet: linear-hole-order-packet-v1.json. Preflight: linear-hole-order-preflight-v1.json (local only). Related genuine native v2 RED evidence: oracle-replay-v2/native-linear-hole-render-v1/REPORT-v1.md.
