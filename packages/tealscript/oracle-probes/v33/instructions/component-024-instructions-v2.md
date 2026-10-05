# V33 component 24 capture v1

Run component-024-discriminator-v33-v1.pine independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, no Bar Replay, default inputs. Load at least 32 closed bars; record actual origin/cutoff/count, account/build and settings. Preserve source bytes; a compiler or runtime refusal is an answer, not a repair instruction. Native phase and values are UNSPECIFIED.

If RUNS, export public chart CSV with time/OHLCV, INDEX and every named VALUE/SRC column at full available precision. INDEX is Pine bar_index, not CSV ordinal. Include the initial INDEX=0 row. If unavailable, mark INITIAL-WINDOW-UNAVAILABLE rather than assigning another row to zero. Exclude live rows from historical values. Retain settings and first/last relevant Data Window screenshots. Record exact error text/code/line/column/first bar when refused. Inaccessible libraries/providers are UNAVAILABLE-LIBRARY/HOST-CONTEXT-HELD, not target refusal. Do not publish or substitute a library.

Exact questions:
- tradingview-ta.aroon.v7: Resolve same-value highestbars/lowestbars selection in the imported Aroon3 body; the helper chooses a latest tie and T differs. Builtin offset sign alone does not decide tie chronology.

Candidate answers: compile refusal (later runtime facet unobserved), runtime refusal with exact first bar, RUNS with helper-model cells, RUNS with saved T cells, or RUNS with a third/ambiguous result. Compare every listed mismatch, startup and recovery separately. Neither model is an expected native answer. Empty/NA is a captured value, not a successful match by itself. The candidate cells below are archival comparison models, not native predictions.

Chart-context discriminator only. Builtin implicit chart OHLC/volume/time cannot be replaced by the archived synthetic fixture. These exact synthetic components remain NATIVE-PENDING unless exported inputs independently match; do not infer closure from a different chart sequence.

Use the exact published import revision written in the source; earlier library-body refusal leaves the target call unobserved. Do not inject a synthetic library.

Candidate models v2

In the following archival rows, expected means the old independent helper, and actual means saved T engine output. Neither is authoritative. Output arrays retain original source column order. Split probes evaluate only their isolated expression; ignore unrelated original columns. For chart-context probes, these synthetic-fixture cells cannot be directly matched to real-chart cells: exact original-input adjudication stays held. Record public chart outputs for a later same-input comparison instead.

```json
[
  {
    "id": "tradingview-ta.aroon.v7",
    "originalSourceSha256": "537aa73611761c98cf6df902ddcb30f1d5b49151f29f2ceef46b15699aec7597",
    "originalBarsSha256": "0d2672f1ac189c7bfe50e4700ad0756c5587d23cbd9c3a220a890fd4164231ff",
    "compiledMismatchDetails": [
      {
        "bar": 3,
        "expected": [
          66.66666666666667,
          0
        ],
        "actual": [
          33.333333333333336,
          0
        ]
      },
      {
        "bar": 4,
        "expected": [
          100,
          66.66666666666667
        ],
        "actual": [
          0,
          66.66666666666667
        ]
      },
      {
        "bar": 5,
        "expected": [
          66.66666666666667,
          100
        ],
        "actual": [
          0,
          100
        ]
      },
      {
        "bar": 6,
        "expected": [
          33.333333333333336,
          100
        ],
        "actual": [
          33.333333333333336,
          66.66666666666667
        ]
      },
      {
        "bar": 7,
        "expected": [
          100,
          66.66666666666667
        ],
        "actual": [
          100,
          33.333333333333336
        ]
      },
      {
        "bar": 8,
        "expected": [
          100,
          33.333333333333336
        ],
        "actual": [
          66.66666666666667,
          0
        ]
      },
      {
        "bar": 9,
        "expected": [
          66.66666666666667,
          0
        ],
        "actual": [
          33.333333333333336,
          0
        ]
      },
      {
        "bar": 10,
        "expected": [
          100,
          66.66666666666667
        ],
        "actual": [
          0,
          66.66666666666667
        ]
      },
      {
        "bar": 11,
        "expected": [
          66.66666666666667,
          100
        ],
        "actual": [
          0,
          100
        ]
      }
    ],
    "publicPathMismatchDetails": [
      {
        "bar": 3,
        "expected": [
          66.66666666666667,
          0
        ],
        "actual": [
          33.333333333333336,
          0
        ]
      },
      {
        "bar": 4,
        "expected": [
          100,
          66.66666666666667
        ],
        "actual": [
          0,
          66.66666666666667
        ]
      },
      {
        "bar": 5,
        "expected": [
          66.66666666666667,
          100
        ],
        "actual": [
          0,
          100
        ]
      },
      {
        "bar": 6,
        "expected": [
          33.333333333333336,
          100
        ],
        "actual": [
          33.333333333333336,
          66.66666666666667
        ]
      },
      {
        "bar": 7,
        "expected": [
          100,
          66.66666666666667
        ],
        "actual": [
          100,
          33.333333333333336
        ]
      },
      {
        "bar": 8,
        "expected": [
          100,
          33.333333333333336
        ],
        "actual": [
          66.66666666666667,
          0
        ]
      },
      {
        "bar": 9,
        "expected": [
          66.66666666666667,
          0
        ],
        "actual": [
          33.333333333333336,
          0
        ]
      },
      {
        "bar": 10,
        "expected": [
          100,
          66.66666666666667
        ],
        "actual": [
          0,
          66.66666666666667
        ]
      },
      {
        "bar": 11,
        "expected": [
          66.66666666666667,
          100
        ],
        "actual": [
          0,
          100
        ]
      }
    ],
    "diagnostics": []
  }
]
```
