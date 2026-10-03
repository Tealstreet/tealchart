# Ledger698/705/720 native outcome probes

Three minimal, one-plot v6 scripts. Predictions are not observations. Each script is registered with its source hash in expected-outcome-v4.json and bundle-manifest-v4.json. Use each entry's record instructions and preserve exact diagnostics if refused. Standard host BINANCE:BTCUSDT,2-minute,standard candles,UTC.

- 698: timenow observation across realtime ticks/reload. Capture ten updates, new bar, idle interval and browser UTC. Pine does not expose provider-arrival timestamps; this does not measure exact provider transmission latency.
- 705: foreground RGB encoding, with logs of foreground and background. Change chart Appearance SOLID backgrounds to black/white controls and #7F7F7F/#808080/#818181. Record theme/settings/screenshots for every run. Repeat light-theme/dark-background and dark-theme/light-background. The docs give no cutoff; one uniform result is insufficient.
- 720: nonconstant synthetic HMA source with one mature hole at40, length16. Export46+ historical bars and logs37-45. Exact half8/sqrt4 isolates nested missing-value publication from rounding. Broad ignore-na policy is documented. Existing v2 captures already cover lengths2/5 holes; this probe adds a distinct composition case.

No production engine or frozen v3 files changed. Shared bundle updates were serialized under /home/sam/.cache/fleet-tmp/v3-bundle.lock.
