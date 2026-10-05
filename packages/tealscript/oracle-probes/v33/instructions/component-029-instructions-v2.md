# V33 component 29 capture v1

Run component-029-discriminator-v33-v1.pine independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, no Bar Replay, default inputs. Load at least 32 closed bars; record actual origin/cutoff/count, account/build and settings. Preserve source bytes; a compiler or runtime refusal is an answer, not a repair instruction. Native phase and values are UNSPECIFIED.

If RUNS, export public chart CSV with time/OHLCV, INDEX and every named VALUE/SRC column at full available precision. INDEX is Pine bar_index, not CSV ordinal. Include the initial INDEX=0 row. If unavailable, mark INITIAL-WINDOW-UNAVAILABLE rather than assigning another row to zero. Exclude live rows from historical values. Retain settings and first/last relevant Data Window screenshots. Record exact error text/code/line/column/first bar when refused. Inaccessible libraries/providers are UNAVAILABLE-LIBRARY/HOST-CONTEXT-HELD, not target refusal. Do not publish or substitute a library.

Exact questions:
- hostile.supertrend.zero-range: Settle constant zero-range bands/direction independently from ordinary OHLC Supertrend captures.

Candidate answers: compile refusal (later runtime facet unobserved), runtime refusal with exact first bar, RUNS with helper-model cells, RUNS with saved T cells, or RUNS with a third/ambiguous result. Compare every listed mismatch, startup and recovery separately. Neither model is an expected native answer. Empty/NA is a captured value, not a successful match by itself. The candidate cells below are archival comparison models, not native predictions.

Chart-context discriminator only. Builtin implicit chart OHLC/volume/time cannot be replaced by the archived synthetic fixture. These exact synthetic components remain NATIVE-PENDING unless exported inputs independently match; do not infer closure from a different chart sequence.



Additional source-identical chart-proxy questions (their synthetic fixtures remain unobserved):
Settle the flat initial band and missing high/low/close transition; clean first-factor evidence does not decide hole recurrence.

Candidate models v2

In the following archival rows, expected means the old independent helper, and actual means saved T engine output. Neither is authoritative. Output arrays retain original source column order. Split probes evaluate only their isolated expression; ignore unrelated original columns. For chart-context probes, these synthetic-fixture cells cannot be directly matched to real-chart cells: exact original-input adjudication stays held. Record public chart outputs for a later same-input comparison instead.

```json
[
  {
    "id": "hostile.supertrend.zero-range",
    "originalSourceSha256": "2e74cf74bfb68291d7b404ba06df16c127afc690d540502dfe608994c28d0681",
    "originalBarsSha256": "1f13853ad7c9e2538b9e53c8b9d3d0673be9129c0bb9cf70fa02f6e3c732dba7",
    "compiledMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          null,
          null
        ],
        "actual": [
          0,
          1
        ]
      },
      {
        "bar": 1,
        "expected": [
          null,
          null
        ],
        "actual": [
          0,
          1
        ]
      },
      {
        "bar": 2,
        "expected": [
          2.6666666666666665,
          1
        ],
        "actual": [
          0,
          1
        ]
      },
      {
        "bar": 3,
        "expected": [
          2.6666666666666665,
          1
        ],
        "actual": [
          -1.1111111111111107,
          -1
        ]
      },
      {
        "bar": 4,
        "expected": [
          2.6666666666666665,
          1
        ],
        "actual": [
          -1.1111111111111107,
          -1
        ]
      }
    ],
    "publicPathMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          null,
          null
        ],
        "actual": [
          0,
          1
        ]
      },
      {
        "bar": 1,
        "expected": [
          null,
          null
        ],
        "actual": [
          0,
          1
        ]
      },
      {
        "bar": 2,
        "expected": [
          2.6666666666666665,
          1
        ],
        "actual": [
          0,
          1
        ]
      },
      {
        "bar": 3,
        "expected": [
          2.6666666666666665,
          1
        ],
        "actual": [
          -1.1111111111111107,
          -1
        ]
      },
      {
        "bar": 4,
        "expected": [
          2.6666666666666665,
          1
        ],
        "actual": [
          -1.1111111111111107,
          -1
        ]
      }
    ],
    "diagnostics": []
  },
  {
    "id": "hostile.supertrend.middle-na",
    "originalSourceSha256": "7c613240937ea272ceee910c261befa9cfa1e3d87b77f306c5936c0997f86f86",
    "originalBarsSha256": "4f11aa27641e5f21f0ba19c70fc2167878827a520e26abcae1fce9858df5d8f4",
    "compiledMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          null,
          null
        ],
        "actual": [
          0,
          1
        ]
      },
      {
        "bar": 1,
        "expected": [
          null,
          null
        ],
        "actual": [
          0,
          1
        ]
      },
      {
        "bar": 2,
        "expected": [
          5.333333333333333,
          1
        ],
        "actual": [
          0,
          1
        ]
      },
      {
        "bar": 3,
        "expected": [
          5.333333333333333,
          1
        ],
        "actual": [
          -3.5555555555555545,
          -1
        ]
      },
      {
        "bar": 4,
        "expected": [
          5.333333333333333,
          1
        ],
        "actual": [
          -3.5555555555555545,
          -1
        ]
      },
      {
        "bar": 5,
        "expected": [
          null,
          null
        ],
        "actual": [
          -3.5555555555555545,
          -1
        ]
      },
      {
        "bar": 6,
        "expected": [
          5.333333333333333,
          1
        ],
        "actual": [
          5.370370370370369,
          1
        ]
      }
    ],
    "publicPathMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          null,
          null
        ],
        "actual": [
          0,
          1
        ]
      },
      {
        "bar": 1,
        "expected": [
          null,
          null
        ],
        "actual": [
          0,
          1
        ]
      },
      {
        "bar": 2,
        "expected": [
          5.333333333333333,
          1
        ],
        "actual": [
          0,
          1
        ]
      },
      {
        "bar": 3,
        "expected": [
          5.333333333333333,
          1
        ],
        "actual": [
          -3.5555555555555545,
          -1
        ]
      },
      {
        "bar": 4,
        "expected": [
          5.333333333333333,
          1
        ],
        "actual": [
          -3.5555555555555545,
          -1
        ]
      },
      {
        "bar": 5,
        "expected": [
          null,
          null
        ],
        "actual": [
          -3.5555555555555545,
          -1
        ]
      },
      {
        "bar": 6,
        "expected": [
          5.333333333333333,
          1
        ],
        "actual": [
          5.370370370370369,
          1
        ]
      }
    ],
    "diagnostics": []
  }
]
```
