# V33 component 1 capture v1

Run component-001-discriminator-v33-v1.pine independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, no Bar Replay, default inputs. Load at least 32 closed bars; record actual origin/cutoff/count, account/build and settings. Preserve source bytes; a compiler or runtime refusal is an answer, not a repair instruction. Native phase and values are UNSPECIFIED.

If RUNS, export public chart CSV with time/OHLCV, INDEX and every named VALUE/SRC column at full available precision. INDEX is Pine bar_index, not CSV ordinal. Include the initial INDEX=0 row. If unavailable, mark INITIAL-WINDOW-UNAVAILABLE rather than assigning another row to zero. Exclude live rows from historical values. Retain settings and first/last relevant Data Window screenshots. Record exact error text/code/line/column/first bar when refused. Inaccessible libraries/providers are UNAVAILABLE-LIBRARY/HOST-CONTEXT-HELD, not target refusal. Do not publish or substitute a library.

Exact questions:
- ta.ema: The helper starts at 10 on bar0; T waits until bar2 and seeds 11.333333333333334. Native len14/15 contradicts universal first-source seeding, but this exact len3 source/input has not been joined to a native capture.

Candidate answers: compile refusal (later runtime facet unobserved), runtime refusal with exact first bar, RUNS with helper-model cells, RUNS with saved T cells, or RUNS with a third/ambiguous result. Compare every listed mismatch, startup and recovery separately. Neither model is an expected native answer. Empty/NA is a captured value, not a successful match by itself. The candidate cells below are archival comparison models, not native predictions.

Exact synthetic explicit-input discriminator. Capture the first 12 Pine indices from zero; later synthetic inputs are missing and have no target credit.



Candidate models v2

In the following archival rows, expected means the old independent helper, and actual means saved T engine output. Neither is authoritative. Output arrays retain original source column order. Split probes evaluate only their isolated expression; ignore unrelated original columns. For chart-context probes, these synthetic-fixture cells cannot be directly matched to real-chart cells: exact original-input adjudication stays held. Record public chart outputs for a later same-input comparison instead.

```json
[
  {
    "id": "ta.ema",
    "originalSourceSha256": "ea952aadd06f5885b29e6c15a47b02add143512a2220d596210d80f08031076b",
    "originalBarsSha256": "ebbc6e9362caa5eb569914a451d6e8073e05471754989e1542ac72eb22fe3000",
    "compiledMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          10
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 1,
        "expected": [
          10.5
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 2,
        "expected": [
          11.75
        ],
        "actual": [
          11.333333333333334
        ]
      },
      {
        "bar": 3,
        "expected": [
          11.875
        ],
        "actual": [
          11.666666666666668
        ]
      },
      {
        "bar": 4,
        "expected": [
          12.9375
        ],
        "actual": [
          12.833333333333334
        ]
      },
      {
        "bar": 5,
        "expected": [
          13.96875
        ],
        "actual": [
          13.916666666666668
        ]
      },
      {
        "bar": 6,
        "expected": [
          13.484375
        ],
        "actual": [
          13.458333333333334
        ]
      },
      {
        "bar": 7,
        "expected": [
          14.7421875
        ],
        "actual": [
          14.729166666666668
        ]
      },
      {
        "bar": 8,
        "expected": [
          16.37109375
        ],
        "actual": [
          16.364583333333336
        ]
      },
      {
        "bar": 9,
        "expected": [
          16.685546875
        ],
        "actual": [
          16.682291666666668
        ]
      },
      {
        "bar": 10,
        "expected": [
          17.8427734375
        ],
        "actual": [
          17.841145833333336
        ]
      },
      {
        "bar": 11,
        "expected": [
          18.92138671875
        ],
        "actual": [
          18.920572916666668
        ]
      }
    ],
    "publicPathMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          10
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 1,
        "expected": [
          10.5
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 2,
        "expected": [
          11.75
        ],
        "actual": [
          11.333333333333334
        ]
      },
      {
        "bar": 3,
        "expected": [
          11.875
        ],
        "actual": [
          11.666666666666668
        ]
      },
      {
        "bar": 4,
        "expected": [
          12.9375
        ],
        "actual": [
          12.833333333333334
        ]
      },
      {
        "bar": 5,
        "expected": [
          13.96875
        ],
        "actual": [
          13.916666666666668
        ]
      },
      {
        "bar": 6,
        "expected": [
          13.484375
        ],
        "actual": [
          13.458333333333334
        ]
      },
      {
        "bar": 7,
        "expected": [
          14.7421875
        ],
        "actual": [
          14.729166666666668
        ]
      },
      {
        "bar": 8,
        "expected": [
          16.37109375
        ],
        "actual": [
          16.364583333333336
        ]
      },
      {
        "bar": 9,
        "expected": [
          16.685546875
        ],
        "actual": [
          16.682291666666668
        ]
      },
      {
        "bar": 10,
        "expected": [
          17.8427734375
        ],
        "actual": [
          17.841145833333336
        ]
      },
      {
        "bar": 11,
        "expected": [
          18.92138671875
        ],
        "actual": [
          18.920572916666668
        ]
      }
    ],
    "diagnostics": []
  }
]
```
