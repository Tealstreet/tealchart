# V33 component 31 capture v1

Run component-031-discriminator-v33-v1.pine independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, no Bar Replay, default inputs. Load at least 256 closed bars; record actual origin/cutoff/count, account/build and settings. Preserve source bytes; a compiler or runtime refusal is an answer, not a repair instruction. Native phase and values are UNSPECIFIED.

If RUNS, export public chart CSV with time/OHLCV, INDEX and every named VALUE/SRC column at full available precision. INDEX is Pine bar_index, not CSV ordinal. Include the initial INDEX=0 row. If unavailable, mark INITIAL-WINDOW-UNAVAILABLE rather than assigning another row to zero. Exclude live rows from historical values. Retain settings and first/last relevant Data Window screenshots. Record exact error text/code/line/column/first bar when refused. Inaccessible libraries/providers are UNAVAILABLE-LIBRARY/HOST-CONTEXT-HELD, not target refusal. Do not publish or substitute a library.

Exact questions:
- ta.sar: The helper publishes-4 at bar0; T is missing. Exact SAR first sample and later reversal cells need a native join.

Candidate answers: compile refusal (later runtime facet unobserved), runtime refusal with exact first bar, RUNS with helper-model cells, RUNS with saved T cells, or RUNS with a third/ambiguous result. Compare every listed mismatch, startup and recovery separately. Neither model is an expected native answer. Empty/NA is a captured value, not a successful match by itself. The candidate cells below are archival comparison models, not native predictions.

Chart-context discriminator only. Builtin implicit chart OHLC/volume/time cannot be replaced by the archived synthetic fixture. These exact synthetic components remain NATIVE-PENDING unless exported inputs independently match; do not infer closure from a different chart sequence.



Additional source-identical chart-proxy questions (their synthetic fixtures remain unobserved):
The helper publishes1 at bar0; T is missing. A nondegenerate SAR capture cannot settle the all-flat sequence.

Candidate models v2

In the following archival rows, expected means the old independent helper, and actual means saved T engine output. Neither is authoritative. Output arrays retain original source column order. Split probes evaluate only their isolated expression; ignore unrelated original columns. For chart-context probes, these synthetic-fixture cells cannot be directly matched to real-chart cells: exact original-input adjudication stays held. Record public chart outputs for a later same-input comparison instead.

```json
[
  {
    "id": "ta.sar",
    "originalSourceSha256": "f3c23814eda55937b7478eca0ba0c612feba2044a8d3becc35ff096a8a5a7de1",
    "originalBarsSha256": "64bc6000588b1a44e4e3e35c65a01177c70eab7bebe7ac5dfc7528b60488928d",
    "compiledMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          -4
        ],
        "actual": [
          null
        ]
      }
    ],
    "publicPathMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          -4
        ],
        "actual": [
          null
        ]
      }
    ],
    "diagnostics": []
  },
  {
    "id": "hostile.sar.flat",
    "originalSourceSha256": "f3c23814eda55937b7478eca0ba0c612feba2044a8d3becc35ff096a8a5a7de1",
    "originalBarsSha256": "ee47d1cd108ecc780bc1e9a8a529ab44e3ec1e094a27427cb61c716ee8aa8db1",
    "compiledMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          1
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 1,
        "expected": [
          1
        ],
        "actual": [
          -1
        ]
      },
      {
        "bar": 3,
        "expected": [
          1
        ],
        "actual": [
          -1
        ]
      },
      {
        "bar": 5,
        "expected": [
          1
        ],
        "actual": [
          -1
        ]
      },
      {
        "bar": 7,
        "expected": [
          1
        ],
        "actual": [
          -1
        ]
      }
    ],
    "publicPathMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          1
        ],
        "actual": [
          null
        ]
      },
      {
        "bar": 1,
        "expected": [
          1
        ],
        "actual": [
          -1
        ]
      },
      {
        "bar": 3,
        "expected": [
          1
        ],
        "actual": [
          -1
        ]
      },
      {
        "bar": 5,
        "expected": [
          1
        ],
        "actual": [
          -1
        ]
      },
      {
        "bar": 7,
        "expected": [
          1
        ],
        "actual": [
          -1
        ]
      }
    ],
    "diagnostics": []
  }
]
```
