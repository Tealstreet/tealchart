# V32 corpus identity 59 v1

Use BINANCE:BTCUSDT, 2-minute standard candles, regular session, UTC and original defaults. Load 23924 closed bars if available; record actual loaded history, cutoff and all changed settings. Preserve source exactly. Record compile outcome and complete diagnostic with line/column. If RUNS, export chart data with time/OHLCV and all available indicator columns, Pine Logs, settings and drawings screenshots. No available output columns must be stated explicitly. Record the first failing bar where visible. Insufficient history is INSUFFICIENT-HISTORY, not full-history credit.

Question: does this unchanged default source RUN, produce blank/missing outputs, or refuse? Native phase and values are UNSPECIFIED. Local synthetic-provider preflight is instrument-only. Required external symbols, timeframes and provider availability must be recorded from settings/errors; inaccessible provider data stays HOST-CONTEXT-HELD. Do not alter source to repair a refusal.

Same-byte corpus records: v7:57. Capture binds only these source identities under authenticated chart/input/history context, not a general builtin policy.


Requires exact public TradingView/ta/1. If unavailable, record UNAVAILABLE-LIBRARY rather than source refusal. Preserve provider failures as the earliest observable outcome; they mask downstream algorithm questions. Do not substitute libraries/provider values or infer full quantitative parity from chart OHLCV alone. Requested indices includeSPX/NDX/RUT/NIFTY/UKX/HSI/NI225/DAX/TSX/IBOV;DGS10 daily andMULTPL/SP500_PE_RATIO_MONTH, financialDIVIDENDS_YIELD, defaultassets and shortvolume providers may be unavailable. Record every provider/input setting and first error.

Original provider-selection input declarations (record actual defaults; source remains unchanged):

```pine
lin                                            = input.string(defval = "Yes", title = "Show Percentage Line Performance? ", options = ["Yes", "No"])
tab                                            = input.string(defval = "Yes", title = "Show Table? ", options = ["Yes", "No"])
col                                            = input.string(defval = "No", title = "Color Table Cells on Better Performer?", options = ["Yes", "No"])
dex                                            = input.string(defval = "SPX", title = "Index Measured Against", options = ["SPX", "NASDAQ", "RUT", "NIFTY", "FTSE", "NIKKEI", "HSI", "DAX", "TSX", "IBOV"])
plo                                            = input.string(defval = "Yes", title = "Plot Index Return?", options = ["Yes", "No"])
asset1                                         = input.symbol(title="", group = "Asset 1", defval="AAPL", inline="1")
ls1                                            = input.string(title = "Direction (Long/Short)", defval = "Long", options = ["Long", "Short"], inline="1")
asset2                                         = input.symbol(title="", group = "Asset 2", defval="MSFT", inline="2")
ls2                                            = input.string(title = "Direction (Long/Short)", defval = "Long", options = ["Long", "Short"], inline="2")
asset3                                         = input.symbol(title="", group = "Asset 3", defval="GOOG", inline="3")
ls3                                            = input.string(title = "Direction (Long/Short)", defval = "Long", options = ["Long", "Short"], inline="3")
asset4                                         = input.symbol(title="", group = "Asset 4", defval="AMZN", inline="4")
ls4                                            = input.string(title = "Direction (Long/Short)", defval = "Long", options = ["Long", "Short"], inline="4")
asset5                                         = input.symbol(title="", group = "Asset 5", defval="META", inline="5")
ls5                                            = input.string(title = "Direction (Long/Short)", defval = "Long", options = ["Long", "Short"], inline="5")
asset6                                         = input.symbol(title="", group = "Asset 6", defval="T", inline="6")
ls6                                            = input.string(title = "Direction (Long/Short)", defval = "Long", options = ["Long", "Short"], inline="6")
asset7                                         = input.symbol(title="", group = "Asset 7", defval="V", inline="7")
ls7                                            = input.string(title = "Direction (Long/Short)", defval = "Long", options = ["Long", "Short"], inline="7")
asset8                                         = input.symbol(title="", group = "Asset 8", defval="MA", inline="8")
ls8                                            = input.string(title = "Direction (Long/Short)", defval = "Long", options = ["Long", "Short"], inline="8")
asset9                                         = input.symbol(title="", group = "Asset 9", defval="TSLA", inline="9")
ls9                                            = input.string(title = "Direction (Long/Short)", defval = "Long", options = ["Long", "Short"], inline="9")
asset10                                        = input.symbol(title="", group = "Asset 10", defval="X", inline="10")
ls10                                           = input.string(title = "Direction (Long/Short)", defval = "Long", options = ["Long", "Short"], inline="10")
```
