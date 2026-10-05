# Strategy Parity Corpus

Regression checks against twelve frozen engine-derived snapshots. The two external TradingView entries have no tracked bars and provide no external execution proof in CI.

## Structure

Each corpus entry is a directory under `corpus/` containing:

```
corpus/001-sma-cross/
├── strategy.pine     # Pine script source
├── bars.json         # OHLCV bar data (array of {time, open, high, low, close, volume})
├── engine_baseline_trades.csv # Frozen engine-derived reference trades
└── meta.json         # Metadata (source, description, trade counts)
```

## Workflow

### 1. Bootstrap (self-parity baseline)

Generate bars and engine-baseline reference CSVs for new strategies:

```bash
npx tsx tests/strategy-parity/bootstrap-corpus.ts
```

This creates `bars.json`, `engine_baseline_trades.csv`, and `meta.json` for any corpus entry that has a `strategy.pine` but is missing those files. The baseline CSV comes from engine output, establishing self-parity.

### 2. Replace with TradingView reference data

To validate against TradingView:

1. Load the same `bars.json` data into TradingView (or use a symbol/timeframe that matches)
2. Add the strategy from `strategy.pine`
3. Export "List of Trades" as CSV from the Strategy Tester
4. Preserve the frozen engine baseline and save the external export as `tv_trades.csv`
5. Update `meta.json` to set `"source": "tradingview"` and add `"tvExportDate"`

### 3. Run parity tests

```bash
npx vitest run tests/strategy-parity/strategy-parity.test.ts
```

## Parity Grading

Trades are aligned greedily by direction and price proximity, then scored:

| Grade | Criteria |
|---|---|
| **Excellent** | Exact count match, entry/exit p90 = 0%, PnL p90 < 0.5% |
| **Strong** | 99%+ count match, entry/exit p90 < 0.1% |
| **Moderate** | 90%+ count match |
| **Weak** | Any matched trades |
| **Minimal** | Zero matches |

## Adding a new corpus entry

1. Create `corpus/NNN-descriptive-name/strategy.pine`
2. Run `npx tsx tests/strategy-parity/bootstrap-corpus.ts` to generate baseline files
3. Tests auto-discover new entries

## CSV Format

Both CSV variants follow TradingView's "List of Trades" export:

```csv
Trade #,Type,Signal,Date/Time,Price,Contracts,Profit,Cum. Profit
1,Entry Long,Long,2023-11-14 22:40:00,100,1,,
1,Exit Long,Close,2023-11-14 22:42:00,105,1,5.00,5.00
```

Entry and exit rows share the same Trade # and are paired sequentially.

The loader refuses CSV filenames claiming TradingView provenance when metadata says `engine-baseline`, even if bars are missing. Bootstrap skips external entries. The two pf-* tests assert KNOWN-UNRUNNABLE with owner, reason, and open item; adding bars makes those assertions fail and requires enabling external execution.
