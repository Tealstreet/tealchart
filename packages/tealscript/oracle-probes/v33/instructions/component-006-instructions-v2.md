# V33 component 6 capture v1

Run component-006-discriminator-v33-v1.pine independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, no Bar Replay, default inputs. Load at least 32 closed bars; record actual origin/cutoff/count, account/build and settings. Preserve source bytes; a compiler or runtime refusal is an answer, not a repair instruction. Native phase and values are UNSPECIFIED.

If RUNS, export public chart CSV with time/OHLCV, INDEX and every named VALUE/SRC column at full available precision. INDEX is Pine bar_index, not CSV ordinal. Include the initial INDEX=0 row. If unavailable, mark INITIAL-WINDOW-UNAVAILABLE rather than assigning another row to zero. Exclude live rows from historical values. Retain settings and first/last relevant Data Window screenshots. Record exact error text/code/line/column/first bar when refused. Inaccessible libraries/providers are UNAVAILABLE-LIBRARY/HOST-CONTEXT-HELD, not target refusal. Do not publish or substitute a library.

Exact questions:
- priority.ta-workhorse-history-values: Resolve the underlying EMA series before its [1] projection and separately adjudicate every other mismatching output in this exact multi-member program.

Candidate answers: compile refusal (later runtime facet unobserved), runtime refusal with exact first bar, RUNS with helper-model cells, RUNS with saved T cells, or RUNS with a third/ambiguous result. Compare every listed mismatch, startup and recovery separately. Neither model is an expected native answer. Empty/NA is a captured value, not a successful match by itself. The candidate cells below are archival comparison models, not native predictions.

Chart-context discriminator only. Builtin implicit chart OHLC/volume/time cannot be replaced by the archived synthetic fixture. These exact synthetic components remain NATIVE-PENDING unless exported inputs independently match; do not infer closure from a different chart sequence.

 Explicit source arguments are synthetic and SRC columns authenticate their holes; implicit high/low/volume/time operands still come from the real chart. This can isolate source publication facets but does not reproduce archived synthetic OHLCV recurrence.

Candidate models v2

In the following archival rows, expected means the old independent helper, and actual means saved T engine output. Neither is authoritative. Output arrays retain original source column order. Split probes evaluate only their isolated expression; ignore unrelated original columns. For chart-context probes, these synthetic-fixture cells cannot be directly matched to real-chart cells: exact original-input adjudication stays held. Record public chart outputs for a later same-input comparison instead.

```json
[
  {
    "id": "priority.ta-workhorse-history-values",
    "originalSourceSha256": "9c27ef3eee23450d77c14ea36c4bc50d666dd8eb7858244c3c21ab588f3f2052",
    "originalBarsSha256": "2c151391f7622377b2df87e635cf04e6acac553bc77c333cb3fafaa2ad81b383",
    "compiledMismatchDetails": [
      {
        "bar": 1,
        "expected": [
          null,
          0,
          null,
          null,
          null,
          0,
          0,
          null,
          null,
          null,
          null,
          2
        ],
        "actual": [
          null,
          null,
          null,
          null,
          null,
          0,
          0,
          null,
          null,
          null,
          null,
          2
        ]
      },
      {
        "bar": 2,
        "expected": [
          null,
          -1,
          null,
          null,
          null,
          0,
          1,
          null,
          null,
          null,
          null,
          3
        ],
        "actual": [
          null,
          null,
          null,
          null,
          null,
          0,
          1,
          null,
          null,
          null,
          null,
          3
        ]
      },
      {
        "bar": 3,
        "expected": [
          -0.6666666666666666,
          -0.5,
          2.6666666666666665,
          1,
          -3,
          0,
          0,
          null,
          -0.6666666666666666,
          -0.6666666666666666,
          null,
          3
        ],
        "actual": [
          -0.6666666666666666,
          -0.6666666666666666,
          2.6666666666666665,
          1,
          -3,
          0,
          0,
          null,
          -0.6666666666666666,
          -0.6666666666666666,
          null,
          3
        ]
      },
      {
        "bar": 4,
        "expected": [
          0,
          0.75,
          2.7777777777777772,
          3,
          -3,
          1,
          0,
          66.66666666666666,
          0.22222222222222224,
          0.6666666666666666,
          0,
          3
        ],
        "actual": [
          0,
          0.6666666666666666,
          2.7777777777777772,
          3,
          -3,
          1,
          0,
          66.66666666666666,
          0.22222222222222224,
          0.6666666666666666,
          0,
          3
        ]
      },
      {
        "bar": 5,
        "expected": [
          0.3333333333333333,
          -0.125,
          3.1851851851851847,
          3,
          -2,
          0,
          1,
          38.095238095238095,
          -0.1851851851851852,
          0.16666666666666666,
          1,
          4
        ],
        "actual": [
          0.3333333333333333,
          -0.16666666666666663,
          3.1851851851851847,
          3,
          -2,
          0,
          1,
          38.095238095238095,
          -0.1851851851851852,
          0.16666666666666666,
          1,
          4
        ]
      },
      {
        "bar": 6,
        "expected": [
          1.3333333333333333,
          1.4375,
          3.7901234567901234,
          4,
          -2,
          1,
          0,
          66.66666666666666,
          0.8765432098765432,
          1.5,
          0,
          5
        ],
        "actual": [
          1.3333333333333333,
          1.4166666666666665,
          3.7901234567901234,
          4,
          -2,
          1,
          0,
          66.66666666666666,
          0.8765432098765432,
          1.5,
          0,
          5
        ]
      },
      {
        "bar": 7,
        "expected": [
          0.6666666666666666,
          0.71875,
          3.860082304526749,
          4,
          -2,
          0,
          0,
          43.881856540084385,
          0.5843621399176955,
          0.8333333333333334,
          1,
          4
        ],
        "actual": [
          0.6666666666666666,
          0.7083333333333333,
          3.860082304526749,
          4,
          -2,
          0,
          0,
          43.881856540084385,
          0.5843621399176955,
          0.8333333333333334,
          1,
          4
        ]
      },
      {
        "bar": 8,
        "expected": [
          0,
          -1.140625,
          3.906721536351166,
          4,
          -4,
          0,
          1,
          29.009762900976284,
          -0.6104252400548696,
          -1,
          2,
          4
        ],
        "actual": [
          0,
          -1.1458333333333333,
          3.906721536351166,
          4,
          -4,
          0,
          1,
          29.009762900976284,
          -0.6104252400548696,
          -1,
          2,
          4
        ]
      },
      {
        "bar": 9,
        "expected": [
          -0.6666666666666666,
          -0.0703125,
          4.271147690900777,
          2,
          -4,
          1,
          0,
          57.689110556940975,
          -0.07361682670324643,
          -0.5,
          0,
          5
        ],
        "actual": [
          -0.6666666666666666,
          -0.07291666666666674,
          4.271147690900777,
          2,
          -4,
          1,
          0,
          57.689110556940975,
          -0.07361682670324643,
          -0.5,
          0,
          5
        ]
      },
      {
        "bar": 10,
        "expected": [
          -0.6666666666666666,
          -0.03515625,
          3.514098460600518,
          2,
          -4,
          0,
          0,
          50.099260061360766,
          -0.049077884468830955,
          -0.16666666666666666,
          1,
          2
        ],
        "actual": [
          -0.6666666666666666,
          -0.03645833333333337,
          3.514098460600518,
          2,
          -4,
          0,
          0,
          50.099260061360766,
          -0.049077884468830955,
          -0.16666666666666666,
          1,
          2
        ]
      },
      {
        "bar": 11,
        "expected": [
          -0.3333333333333333,
          -1.017578125,
          3.342732307067012,
          2,
          -3,
          0,
          1,
          35.92132505175984,
          -0.6993852563125539,
          -0.8333333333333334,
          2,
          3
        ],
        "actual": [
          -0.3333333333333333,
          -1.0182291666666665,
          3.342732307067012,
          2,
          -3,
          0,
          1,
          35.92132505175984,
          -0.6993852563125539,
          -0.8333333333333334,
          2,
          3
        ]
      }
    ],
    "publicPathMismatchDetails": [
      {
        "bar": 1,
        "expected": [
          null,
          0,
          null,
          null,
          null,
          0,
          0,
          null,
          null,
          null,
          null,
          2
        ],
        "actual": [
          null,
          null,
          null,
          null,
          null,
          0,
          0,
          null,
          null,
          null,
          null,
          2
        ]
      },
      {
        "bar": 2,
        "expected": [
          null,
          -1,
          null,
          null,
          null,
          0,
          1,
          null,
          null,
          null,
          null,
          3
        ],
        "actual": [
          null,
          null,
          null,
          null,
          null,
          0,
          1,
          null,
          null,
          null,
          null,
          3
        ]
      },
      {
        "bar": 3,
        "expected": [
          -0.6666666666666666,
          -0.5,
          2.6666666666666665,
          1,
          -3,
          0,
          0,
          null,
          -0.6666666666666666,
          -0.6666666666666666,
          null,
          3
        ],
        "actual": [
          -0.6666666666666666,
          -0.6666666666666666,
          2.6666666666666665,
          1,
          -3,
          0,
          0,
          null,
          -0.6666666666666666,
          -0.6666666666666666,
          null,
          3
        ]
      },
      {
        "bar": 4,
        "expected": [
          0,
          0.75,
          2.7777777777777772,
          3,
          -3,
          1,
          0,
          66.66666666666666,
          0.22222222222222224,
          0.6666666666666666,
          0,
          3
        ],
        "actual": [
          0,
          0.6666666666666666,
          2.7777777777777772,
          3,
          -3,
          1,
          0,
          66.66666666666666,
          0.22222222222222224,
          0.6666666666666666,
          0,
          3
        ]
      },
      {
        "bar": 5,
        "expected": [
          0.3333333333333333,
          -0.125,
          3.1851851851851847,
          3,
          -2,
          0,
          1,
          38.095238095238095,
          -0.1851851851851852,
          0.16666666666666666,
          1,
          4
        ],
        "actual": [
          0.3333333333333333,
          -0.16666666666666663,
          3.1851851851851847,
          3,
          -2,
          0,
          1,
          38.095238095238095,
          -0.1851851851851852,
          0.16666666666666666,
          1,
          4
        ]
      },
      {
        "bar": 6,
        "expected": [
          1.3333333333333333,
          1.4375,
          3.7901234567901234,
          4,
          -2,
          1,
          0,
          66.66666666666666,
          0.8765432098765432,
          1.5,
          0,
          5
        ],
        "actual": [
          1.3333333333333333,
          1.4166666666666665,
          3.7901234567901234,
          4,
          -2,
          1,
          0,
          66.66666666666666,
          0.8765432098765432,
          1.5,
          0,
          5
        ]
      },
      {
        "bar": 7,
        "expected": [
          0.6666666666666666,
          0.71875,
          3.860082304526749,
          4,
          -2,
          0,
          0,
          43.881856540084385,
          0.5843621399176955,
          0.8333333333333334,
          1,
          4
        ],
        "actual": [
          0.6666666666666666,
          0.7083333333333333,
          3.860082304526749,
          4,
          -2,
          0,
          0,
          43.881856540084385,
          0.5843621399176955,
          0.8333333333333334,
          1,
          4
        ]
      },
      {
        "bar": 8,
        "expected": [
          0,
          -1.140625,
          3.906721536351166,
          4,
          -4,
          0,
          1,
          29.009762900976284,
          -0.6104252400548696,
          -1,
          2,
          4
        ],
        "actual": [
          0,
          -1.1458333333333333,
          3.906721536351166,
          4,
          -4,
          0,
          1,
          29.009762900976284,
          -0.6104252400548696,
          -1,
          2,
          4
        ]
      },
      {
        "bar": 9,
        "expected": [
          -0.6666666666666666,
          -0.0703125,
          4.271147690900777,
          2,
          -4,
          1,
          0,
          57.689110556940975,
          -0.07361682670324643,
          -0.5,
          0,
          5
        ],
        "actual": [
          -0.6666666666666666,
          -0.07291666666666674,
          4.271147690900777,
          2,
          -4,
          1,
          0,
          57.689110556940975,
          -0.07361682670324643,
          -0.5,
          0,
          5
        ]
      },
      {
        "bar": 10,
        "expected": [
          -0.6666666666666666,
          -0.03515625,
          3.514098460600518,
          2,
          -4,
          0,
          0,
          50.099260061360766,
          -0.049077884468830955,
          -0.16666666666666666,
          1,
          2
        ],
        "actual": [
          -0.6666666666666666,
          -0.03645833333333337,
          3.514098460600518,
          2,
          -4,
          0,
          0,
          50.099260061360766,
          -0.049077884468830955,
          -0.16666666666666666,
          1,
          2
        ]
      },
      {
        "bar": 11,
        "expected": [
          -0.3333333333333333,
          -1.017578125,
          3.342732307067012,
          2,
          -3,
          0,
          1,
          35.92132505175984,
          -0.6993852563125539,
          -0.8333333333333334,
          2,
          3
        ],
        "actual": [
          -0.3333333333333333,
          -1.0182291666666665,
          3.342732307067012,
          2,
          -3,
          0,
          1,
          35.92132505175984,
          -0.6993852563125539,
          -0.8333333333333334,
          2,
          3
        ]
      }
    ],
    "diagnostics": []
  }
]
```
