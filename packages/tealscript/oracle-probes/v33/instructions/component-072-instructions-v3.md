# V33 component 72 capture v1

Run component-072-discriminator-v33-v1.pine independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, no Bar Replay, default inputs. Load at least 32 closed bars; record actual origin/cutoff/count, account/build and settings. Preserve source bytes; a compiler or runtime refusal is an answer, not a repair instruction. Native phase and values are UNSPECIFIED.

If RUNS, export public chart CSV with time/OHLCV, INDEX and every named VALUE/SRC column at full available precision. INDEX is Pine bar_index, not CSV ordinal. Include the initial INDEX=0 row. If unavailable, mark INITIAL-WINDOW-UNAVAILABLE rather than assigning another row to zero. Exclude live rows from historical values. Retain settings and first/last relevant Data Window screenshots. Record exact error text/code/line/column/first bar when refused. Inaccessible libraries/providers are UNAVAILABLE-LIBRARY/HOST-CONTEXT-HELD, not target refusal. Do not publish or substitute a library.

Exact questions:
- language.dynamic-history-max-bars-back-na: At bar3 T reads current2 instead of missing. Captured v3 close[int(na)] current-value evidence is related; exact v6 custom-series and max_bars_back source remains to be joined.

Candidate answers: compile refusal (later runtime facet unobserved), runtime refusal with exact first bar, RUNS with helper-model cells, RUNS with saved T cells, or RUNS with a third/ambiguous result. Compare every listed mismatch, startup and recovery separately. Neither model is an expected native answer. Empty/NA is a captured value, not a successful match by itself. The candidate cells below are archival comparison models, not native predictions.

Exact synthetic explicit-input discriminator. Capture the first 12 Pine indices from zero; later synthetic inputs are missing and have no target credit.



Candidate models v2

In the following archival rows, expected means the old independent helper, and actual means saved T engine output. Neither is authoritative. Output arrays retain original source column order. Split probes evaluate only their isolated expression; ignore unrelated original columns. For chart-context probes, these synthetic-fixture cells cannot be directly matched to real-chart cells: exact original-input adjudication stays held. Record public chart outputs for a later same-input comparison instead.

```json
[
  {
    "id": "language.dynamic-history-max-bars-back-na",
    "originalSourceSha256": "340835e1638a4bf75ec197b8e8d7fefd98857bac12c9940ae792bb6f184f7b66",
    "originalBarsSha256": "2c151391f7622377b2df87e635cf04e6acac553bc77c333cb3fafaa2ad81b383",
    "compiledMismatchDetails": [
      {
        "bar": 3,
        "expected": [
          null,
          1
        ],
        "actual": [
          2,
          0
        ]
      }
    ],
    "publicPathMismatchDetails": [
      {
        "bar": 3,
        "expected": [
          null,
          1
        ],
        "actual": [
          2,
          0
        ]
      }
    ],
    "diagnostics": []
  }
]
```

Output mapping v3

This source has TWO target outputs: VALUE_1 maps to zero-based original plot/model index0 (the history read); VALUE_2 maps to original index1 (its na predicate). INDEX and SRC_CLOSE are identification/input controls, not original model outputs. Original multi-output diagnostics and truncated model arrays describe the original compound source, not the isolated probe. A missing selected model cell is MODEL-UNAVAILABLE, never inferred NA. Record any isolated refusal independently; sibling-original failure phases cannot predict it. Chart-input-dependent model cells retain the explicit HOST-CONTEXT hold.
