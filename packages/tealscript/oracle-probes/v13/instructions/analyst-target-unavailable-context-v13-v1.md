# Analyst target unavailable context probe v1

Rank1542, source SHA `95dd9803c21679bbbafe8ecb825dc5bb3de38dbb7c4ab619cf0824f5edcd1d25`;16 data-window plots, indicator-only. Native observations UNOBSERVED.

Capture each listed context with source SHA, symbol, timeframe, chart/session/exchange timezone and exact full CSV. INPUT_TIME/INPUT_CLOSE must remain finite. Preserve raw targets, matching NA flags, and last-bar marker; do not turn a uniformly missing result into a universal rule. AAPL is a publication-positive control from the earlier v7 capture; if its targets are missing now, record timing/setup rather than assume an instrument defect or force finite values. No required output is asserted for unobserved contexts.

Current docs only say market-closed analyst publication can return na until open. Additional finite captures narrow context behavior; they cannot establish a universal unavailable-symbol contract.
