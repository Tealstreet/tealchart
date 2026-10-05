# V33 component 75 capture v1

Run component-075-collection-history-v33-v1.pine independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, no Bar Replay, default inputs. Load at least 32 closed bars; record actual origin/cutoff/count, account/build and settings. Preserve source bytes; a compiler or runtime refusal is an answer, not a repair instruction. Native phase and values are UNSPECIFIED.

If RUNS, export public chart CSV with time/OHLCV, INDEX and every named VALUE/SRC column at full available precision. INDEX is Pine bar_index, not CSV ordinal. Include the initial INDEX=0 row. If unavailable, mark INITIAL-WINDOW-UNAVAILABLE rather than assigning another row to zero. Exclude live rows from historical values. Retain settings and first/last relevant Data Window screenshots. Record exact error text/code/line/column/first bar when refused. Inaccessible libraries/providers are UNAVAILABLE-LIBRARY/HOST-CONTEXT-HELD, not target refusal. Do not publish or substitute a library.

Exact questions:
- language.collection-history-offset-boundaries: The source uses collection[-1] and fractional offsets, then tests unavailable handles. Native scalar offset refusal is not by itself a collection-history trace; isolate the first executed error and each collection kind.

Candidate answers: compile refusal (later runtime facet unobserved), runtime refusal with exact first bar, RUNS with helper-model cells, RUNS with saved T cells, or RUNS with a third/ambiguous result. Compare every listed mismatch, startup and recovery separately. Neither model is an expected native answer. Empty/NA is a captured value, not a successful match by itself. The candidate cells below are archival comparison models, not native predictions.

Chart-context discriminator only. Builtin implicit chart OHLC/volume/time cannot be replaced by the archived synthetic fixture. These exact synthetic components remain NATIVE-PENDING unless exported inputs independently match; do not infer closure from a different chart sequence.

Only one collection-history expression executes; earliest sibling error cannot mask it. This is reference availability/offset policy, not immutable collection snapshots.

Candidate models v2

In the following archival rows, expected means the old independent helper, and actual means saved T engine output. Neither is authoritative. Output arrays retain original source column order. Split probes evaluate only their isolated expression; ignore unrelated original columns. For chart-context probes, these synthetic-fixture cells cannot be directly matched to real-chart cells: exact original-input adjudication stays held. Record public chart outputs for a later same-input comparison instead.

```json
[
  {
    "id": "language.collection-history-offset-boundaries",
    "originalSourceSha256": "9375f4e810f086fff5e7406f8ed5995c0867b969fd7da791a1ba908fbd2ff290",
    "originalBarsSha256": "2c151391f7622377b2df87e635cf04e6acac553bc77c333cb3fafaa2ad81b383",
    "compiledMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          null,
          null,
          null,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 1,
        "expected": [
          0,
          1,
          -1,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 2,
        "expected": [
          -2,
          -1,
          -3,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 3,
        "expected": [
          0,
          1,
          -1,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 4,
        "expected": [
          2,
          3,
          1,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 5,
        "expected": [
          -1,
          0,
          -2,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 6,
        "expected": [
          3,
          4,
          2,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 7,
        "expected": [
          0,
          1,
          -1,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 8,
        "expected": [
          -3,
          -2,
          -4,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 9,
        "expected": [
          1,
          2,
          0,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 10,
        "expected": [
          0,
          1,
          -1,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 11,
        "expected": [
          -2,
          -1,
          -3,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      }
    ],
    "publicPathMismatchDetails": [
      {
        "bar": 0,
        "expected": [
          null,
          null,
          null,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 1,
        "expected": [
          0,
          1,
          -1,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 2,
        "expected": [
          -2,
          -1,
          -3,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 3,
        "expected": [
          0,
          1,
          -1,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 4,
        "expected": [
          2,
          3,
          1,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 5,
        "expected": [
          -1,
          0,
          -2,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 6,
        "expected": [
          3,
          4,
          2,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 7,
        "expected": [
          0,
          1,
          -1,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 8,
        "expected": [
          -3,
          -2,
          -4,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 9,
        "expected": [
          1,
          2,
          0,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 10,
        "expected": [
          0,
          1,
          -1,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      },
      {
        "bar": 11,
        "expected": [
          -2,
          -1,
          -3,
          1,
          1,
          1
        ],
        "actual": [
          null,
          null,
          null
        ]
      }
    ],
    "diagnostics": []
  }
]
```

Output mapping v3

VALUE_1 maps only to zero-based original plot/model index 2 (one-based column 3). INDEX is a new identification control, not an original model output. Original multi-output diagnostics and truncated model arrays describe the original compound source, not the isolated probe. A missing selected model cell is MODEL-UNAVAILABLE, never inferred NA. Record any isolated refusal independently; sibling-original failure phases cannot predict it. Chart-input-dependent model cells retain the explicit HOST-CONTEXT hold.
