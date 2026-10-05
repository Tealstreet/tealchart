# V33 component 48 capture v1

Run component-048-discriminator-v33-v1.pine independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, no Bar Replay, default inputs. Load at least 32 closed bars; record actual origin/cutoff/count, account/build and settings. Preserve source bytes; a compiler or runtime refusal is an answer, not a repair instruction. Native phase and values are UNSPECIFIED.

If RUNS, export public chart CSV with time/OHLCV, INDEX and every named VALUE/SRC column at full available precision. INDEX is Pine bar_index, not CSV ordinal. Include the initial INDEX=0 row. If unavailable, mark INITIAL-WINDOW-UNAVAILABLE rather than assigning another row to zero. Exclude live rows from historical values. Retain settings and first/last relevant Data Window screenshots. Record exact error text/code/line/column/first bar when refused. Inaccessible libraries/providers are UNAVAILABLE-LIBRARY/HOST-CONTEXT-HELD, not target refusal. Do not publish or substitute a library.

Exact questions:
- hostile.highestbars.plateau: At bar2 helper selects newest tied extreme0; T selects-1. The documented offset sign does not select a tie winner.

Candidate answers: compile refusal (later runtime facet unobserved), runtime refusal with exact first bar, RUNS with helper-model cells, RUNS with saved T cells, or RUNS with a third/ambiguous result. Compare every listed mismatch, startup and recovery separately. Neither model is an expected native answer. Empty/NA is a captured value, not a successful match by itself. The candidate cells below are archival comparison models, not native predictions.

Exact synthetic explicit-input discriminator. Capture the first 12 Pine indices from zero; later synthetic inputs are missing and have no target credit.



Candidate models v2

In the following archival rows, expected means the old independent helper, and actual means saved T engine output. Neither is authoritative. Output arrays retain original source column order. Split probes evaluate only their isolated expression; ignore unrelated original columns. For chart-context probes, these synthetic-fixture cells cannot be directly matched to real-chart cells: exact original-input adjudication stays held. Record public chart outputs for a later same-input comparison instead.

```json
[
  {
    "id": "hostile.highestbars.plateau",
    "originalSourceSha256": "7b3349d1651871323f27e42d53e1053e11b49fed01dd35f48b3a29b20ddfb23c",
    "originalBarsSha256": "0d2672f1ac189c7bfe50e4700ad0756c5587d23cbd9c3a220a890fd4164231ff",
    "compiledMismatchDetails": [
      {
        "bar": 2,
        "expected": [
          0
        ],
        "actual": [
          -1
        ]
      },
      {
        "bar": 3,
        "expected": [
          -1
        ],
        "actual": [
          -2
        ]
      },
      {
        "bar": 4,
        "expected": [
          0
        ],
        "actual": [
          -2
        ]
      },
      {
        "bar": 8,
        "expected": [
          0
        ],
        "actual": [
          -1
        ]
      },
      {
        "bar": 9,
        "expected": [
          -1
        ],
        "actual": [
          -2
        ]
      },
      {
        "bar": 10,
        "expected": [
          0
        ],
        "actual": [
          -2
        ]
      }
    ],
    "publicPathMismatchDetails": [
      {
        "bar": 2,
        "expected": [
          0
        ],
        "actual": [
          -1
        ]
      },
      {
        "bar": 3,
        "expected": [
          -1
        ],
        "actual": [
          -2
        ]
      },
      {
        "bar": 4,
        "expected": [
          0
        ],
        "actual": [
          -2
        ]
      },
      {
        "bar": 8,
        "expected": [
          0
        ],
        "actual": [
          -1
        ]
      },
      {
        "bar": 9,
        "expected": [
          -1
        ],
        "actual": [
          -2
        ]
      },
      {
        "bar": 10,
        "expected": [
          0
        ],
        "actual": [
          -2
        ]
      }
    ],
    "diagnostics": []
  }
]
```
