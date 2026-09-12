> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus Strategy Ledger Output Classifier v1

## Basis

- Measurement commit: `f1bf632436` (`fix(tealscript): count active strategy ledgers as corpus output`), measured from a clean `git archive` of that commit.
- Prior comparison points: v6 fixture delta v1 at `94cae779898ba55e04e67df644e6025f7e281251`; v5 fixture delta v4 at `73df52e69ba58fb49483384bec87327ee06448da`.
- Corpus inputs: fixed v6 corpus at `packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911`; fixed v5 corpus at `packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910`.
- Reports: `external-pine-corpus-v6.fixture-profile-delta-v2.md` and `external-pine-corpus-v5.fixture-profile-delta-v5.md`.

## Rule

The output classifier now counts active strategy ledger output as output only when there is ledger activity: orders, fills, open trades, closed trades, or nonzero position. A strategy declaration with no orders, fills, trades, or position remains silent.

This matches Pine's strategy model: a strategy may produce a broker-emulator ledger without visual plots or drawings, and that ledger is a real user-visible result. Merely having an empty ledger is not output.

## Corpus Movement

| Corpus/profile | Previous output | New output | Achievable output | Strategy-only ledger rows now counted |
| --- | ---: | ---: | ---: | ---: |
| v6 daily | 716/1000 | 774/1000 | 774/934 = 82.87% | 45 |
| v6 context-stress | 719/1000 | 779/1000 | 779/934 = 83.4% | 47 |
| v5 daily | 856/1000 | 865/1000 | 865/923 = 93.72% | 1 |
| v5 context-stress | 856/1000 | 867/1000 | 867/923 = 93.93% | 1 |

The total output movement includes both the classifier fix and intervening engine fixes between the previous reports and `f1bf632436`. The last column isolates rows whose current output is strategy ledger activity only: no plots, drawings, alerts, or logs.

## v6 Strategy-Only Rows

- Daily profile: 45 strategy rows now count as output solely because they placed orders/fills/trades or held position.
- Context-stress profile: 47 strategy rows now count as output solely because they placed orders/fills/trades or held position.
- The context profile adds two more active strategy-only rows than daily: `sources/0695__TradersPost-pinescript-agents__traderspost-replay.pine` and `sources/0717__dipayansamanta172-lgtm-tradingbot__main.pine`.

## v5 Strategy-Only Rows

- Daily and context-stress both expose one strategy-only row: `sources/0664__SammyEnigma-pine-scripts__bb-rsi.pine`.

## Conclusion

The previous classifier had a strategy blind spot: strategies with active broker-emulator output but no visual output were counted as `no-output-compiled`. That depressed both v6 and v5 support measurements. The fix does not count inactive strategies as output.
