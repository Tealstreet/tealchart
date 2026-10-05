# V33 component 5 capture v1

Run component-005-discriminator-v33-v1.pine independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, no Bar Replay, default inputs. Load at least 32 closed bars; record actual origin/cutoff/count, account/build and settings. Preserve source bytes; a compiler or runtime refusal is an answer, not a repair instruction. Native phase and values are UNSPECIFIED.

If RUNS, export public chart CSV with time/OHLCV, INDEX and every named VALUE/SRC column at full available precision. INDEX is Pine bar_index, not CSV ordinal. Include the initial INDEX=0 row. If unavailable, mark INITIAL-WINDOW-UNAVAILABLE rather than assigning another row to zero. Exclude live rows from historical values. Retain settings and first/last relevant Data Window screenshots. Record exact error text/code/line/column/first bar when refused. Inaccessible libraries/providers are UNAVAILABLE-LIBRARY/HOST-CONTEXT-HELD, not target refusal. Do not publish or substitute a library.

Exact questions:
- depth.ta-named-workhorse-values: Resolve the named EMA bootstrap separately from the other named outputs. Inspect every saved mismatching output index; a positional EMA receipt cannot waive the union.

Candidate answers: compile refusal (later runtime facet unobserved), runtime refusal with exact first bar, RUNS with helper-model cells, RUNS with saved T cells, or RUNS with a third/ambiguous result. Compare every listed mismatch, startup and recovery separately. Neither model is an expected native answer. Empty/NA is a captured value, not a successful match by itself. The candidate cells below are archival comparison models, not native predictions.

Chart-context discriminator only. Builtin implicit chart OHLC/volume/time cannot be replaced by the archived synthetic fixture. These exact synthetic components remain NATIVE-PENDING unless exported inputs independently match; do not infer closure from a different chart sequence.

 Explicit source arguments are synthetic and SRC columns authenticate their holes; implicit high/low/volume/time operands still come from the real chart. This can isolate source publication facets but does not reproduce archived synthetic OHLCV recurrence.

Candidate models v2

In the following archival rows, expected means the old independent helper, and actual means saved T engine output. Neither is authoritative. Output arrays retain original source column order. Split probes evaluate only their isolated expression; ignore unrelated original columns. For chart-context probes, these synthetic-fixture cells cannot be directly matched to real-chart cells: exact original-input adjudication stays held. Record public chart outputs for a later same-input comparison instead.

```json
[
  {
    "id": "depth.ta-named-workhorse-values",
    "originalSourceSha256": "f8760e0f6dc6466e0307f8b78692991c6f5473ad61e1b3bcea08ba16f0178f45",
    "originalBarsSha256": "2c151391f7622377b2df87e635cf04e6acac553bc77c333cb3fafaa2ad81b383",
    "compiledMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          0,
          null,
          null,
          null,
          null,
          0,
          0
        ],
        "actual": [
          null,
          null,
          null,
          null,
          null,
          0,
          0
        ]
      },
      {
        "bar": 1,
        "expected": [
          -1,
          null,
          null,
          null,
          null,
          0,
          1
        ],
        "actual": [
          null,
          null,
          null,
          null,
          null,
          0,
          1
        ]
      },
      {
        "bar": 2,
        "expected": [
          -0.5,
          -0.6666666666666666,
          1,
          -3,
          2.6666666666666665,
          0,
          0
        ],
        "actual": [
          -0.6666666666666666,
          -0.6666666666666666,
          1,
          -3,
          2.6666666666666665,
          0,
          0
        ]
      },
      {
        "bar": 3,
        "expected": [
          0.75,
          0,
          3,
          -3,
          2.7777777777777772,
          1,
          0
        ],
        "actual": [
          0.6666666666666666,
          0,
          3,
          -3,
          2.7777777777777772,
          1,
          0
        ]
      },
      {
        "bar": 4,
        "expected": [
          -0.125,
          0.3333333333333333,
          3,
          -2,
          3.1851851851851847,
          0,
          1
        ],
        "actual": [
          -0.16666666666666663,
          0.3333333333333333,
          3,
          -2,
          3.1851851851851847,
          0,
          1
        ]
      },
      {
        "bar": 5,
        "expected": [
          1.4375,
          1.3333333333333333,
          4,
          -2,
          3.7901234567901234,
          1,
          0
        ],
        "actual": [
          1.4166666666666665,
          1.3333333333333333,
          4,
          -2,
          3.7901234567901234,
          1,
          0
        ]
      },
      {
        "bar": 6,
        "expected": [
          0.71875,
          0.6666666666666666,
          4,
          -2,
          3.860082304526749,
          0,
          0
        ],
        "actual": [
          0.7083333333333333,
          0.6666666666666666,
          4,
          -2,
          3.860082304526749,
          0,
          0
        ]
      },
      {
        "bar": 7,
        "expected": [
          -1.140625,
          0,
          4,
          -4,
          3.906721536351166,
          0,
          1
        ],
        "actual": [
          -1.1458333333333333,
          0,
          4,
          -4,
          3.906721536351166,
          0,
          1
        ]
      },
      {
        "bar": 8,
        "expected": [
          -0.0703125,
          -0.6666666666666666,
          2,
          -4,
          4.271147690900777,
          1,
          0
        ],
        "actual": [
          -0.07291666666666674,
          -0.6666666666666666,
          2,
          -4,
          4.271147690900777,
          1,
          0
        ]
      },
      {
        "bar": 9,
        "expected": [
          -0.03515625,
          -0.6666666666666666,
          2,
          -4,
          3.514098460600518,
          0,
          0
        ],
        "actual": [
          -0.03645833333333337,
          -0.6666666666666666,
          2,
          -4,
          3.514098460600518,
          0,
          0
        ]
      },
      {
        "bar": 10,
        "expected": [
          -1.017578125,
          -0.3333333333333333,
          2,
          -3,
          3.342732307067012,
          0,
          1
        ],
        "actual": [
          -1.0182291666666665,
          -0.3333333333333333,
          2,
          -3,
          3.342732307067012,
          0,
          1
        ]
      },
      {
        "bar": 11,
        "expected": [
          0.4912109375,
          0,
          3,
          -3,
          3.8951548713780078,
          1,
          0
        ],
        "actual": [
          0.49088541666666674,
          0,
          3,
          -3,
          3.8951548713780078,
          1,
          0
        ]
      }
    ],
    "publicPathMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          0,
          null,
          null,
          null,
          null,
          0,
          0
        ],
        "actual": [
          null,
          null,
          null,
          null,
          null,
          0,
          0
        ]
      },
      {
        "bar": 1,
        "expected": [
          -1,
          null,
          null,
          null,
          null,
          0,
          1
        ],
        "actual": [
          null,
          null,
          null,
          null,
          null,
          0,
          1
        ]
      },
      {
        "bar": 2,
        "expected": [
          -0.5,
          -0.6666666666666666,
          1,
          -3,
          2.6666666666666665,
          0,
          0
        ],
        "actual": [
          -0.6666666666666666,
          -0.6666666666666666,
          1,
          -3,
          2.6666666666666665,
          0,
          0
        ]
      },
      {
        "bar": 3,
        "expected": [
          0.75,
          0,
          3,
          -3,
          2.7777777777777772,
          1,
          0
        ],
        "actual": [
          0.6666666666666666,
          0,
          3,
          -3,
          2.7777777777777772,
          1,
          0
        ]
      },
      {
        "bar": 4,
        "expected": [
          -0.125,
          0.3333333333333333,
          3,
          -2,
          3.1851851851851847,
          0,
          1
        ],
        "actual": [
          -0.16666666666666663,
          0.3333333333333333,
          3,
          -2,
          3.1851851851851847,
          0,
          1
        ]
      },
      {
        "bar": 5,
        "expected": [
          1.4375,
          1.3333333333333333,
          4,
          -2,
          3.7901234567901234,
          1,
          0
        ],
        "actual": [
          1.4166666666666665,
          1.3333333333333333,
          4,
          -2,
          3.7901234567901234,
          1,
          0
        ]
      },
      {
        "bar": 6,
        "expected": [
          0.71875,
          0.6666666666666666,
          4,
          -2,
          3.860082304526749,
          0,
          0
        ],
        "actual": [
          0.7083333333333333,
          0.6666666666666666,
          4,
          -2,
          3.860082304526749,
          0,
          0
        ]
      },
      {
        "bar": 7,
        "expected": [
          -1.140625,
          0,
          4,
          -4,
          3.906721536351166,
          0,
          1
        ],
        "actual": [
          -1.1458333333333333,
          0,
          4,
          -4,
          3.906721536351166,
          0,
          1
        ]
      },
      {
        "bar": 8,
        "expected": [
          -0.0703125,
          -0.6666666666666666,
          2,
          -4,
          4.271147690900777,
          1,
          0
        ],
        "actual": [
          -0.07291666666666674,
          -0.6666666666666666,
          2,
          -4,
          4.271147690900777,
          1,
          0
        ]
      },
      {
        "bar": 9,
        "expected": [
          -0.03515625,
          -0.6666666666666666,
          2,
          -4,
          3.514098460600518,
          0,
          0
        ],
        "actual": [
          -0.03645833333333337,
          -0.6666666666666666,
          2,
          -4,
          3.514098460600518,
          0,
          0
        ]
      },
      {
        "bar": 10,
        "expected": [
          -1.017578125,
          -0.3333333333333333,
          2,
          -3,
          3.342732307067012,
          0,
          1
        ],
        "actual": [
          -1.0182291666666665,
          -0.3333333333333333,
          2,
          -3,
          3.342732307067012,
          0,
          1
        ]
      },
      {
        "bar": 11,
        "expected": [
          0.4912109375,
          0,
          3,
          -3,
          3.8951548713780078,
          1,
          0
        ],
        "actual": [
          0.49088541666666674,
          0,
          3,
          -3,
          3.8951548713780078,
          1,
          0
        ]
      }
    ],
    "diagnostics": []
  }
]
```
