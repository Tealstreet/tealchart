# V33 component 47 capture v1

Run component-047-discriminator-v33-v1.pine independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, no Bar Replay, default inputs. Load at least 32 closed bars; record actual origin/cutoff/count, account/build and settings. Preserve source bytes; a compiler or runtime refusal is an answer, not a repair instruction. Native phase and values are UNSPECIFIED.

If RUNS, export public chart CSV with time/OHLCV, INDEX and every named VALUE/SRC column at full available precision. INDEX is Pine bar_index, not CSV ordinal. Include the initial INDEX=0 row. If unavailable, mark INITIAL-WINDOW-UNAVAILABLE rather than assigning another row to zero. Exclude live rows from historical values. Retain settings and first/last relevant Data Window screenshots. Record exact error text/code/line/column/first bar when refused. Inaccessible libraries/providers are UNAVAILABLE-LIBRARY/HOST-CONTEXT-HELD, not target refusal. Do not publish or substitute a library.

Exact questions:
- invariant.kc.tuple-coherence: A source EMA and range EMA can warm independently. Resolve whether native permits finite basis/missing bands at this exact repeated-hole input; do not infer a tuple mask from band ordering.

Candidate answers: compile refusal (later runtime facet unobserved), runtime refusal with exact first bar, RUNS with helper-model cells, RUNS with saved T cells, or RUNS with a third/ambiguous result. Compare every listed mismatch, startup and recovery separately. Neither model is an expected native answer. Empty/NA is a captured value, not a successful match by itself. The candidate cells below are archival comparison models, not native predictions.

Chart-context discriminator only. Builtin implicit chart OHLC/volume/time cannot be replaced by the archived synthetic fixture. These exact synthetic components remain NATIVE-PENDING unless exported inputs independently match; do not infer closure from a different chart sequence.

 Explicit source arguments are synthetic and SRC columns authenticate their holes; implicit high/low/volume/time operands still come from the real chart. This can isolate source publication facets but does not reproduce archived synthetic OHLCV recurrence.

Candidate models v2

In the following archival rows, expected means the old independent helper, and actual means saved T engine output. Neither is authoritative. Output arrays retain original source column order. Split probes evaluate only their isolated expression; ignore unrelated original columns. For chart-context probes, these synthetic-fixture cells cannot be directly matched to real-chart cells: exact original-input adjudication stays held. Record public chart outputs for a later same-input comparison instead.

```json
[
  {
    "id": "invariant.kc.tuple-coherence",
    "originalSourceSha256": "16b967b29d809e9a8768ef921faa367bc4491fab59bdeb31eac02d385512abaf",
    "originalBarsSha256": "fb834bcfd7b9451f38689ffee27fe90db911fa457a0536e6d9767122cd5759cf",
    "compiledMismatchDetails": [
      {
        "bar": 3,
        "expected": [
          1
        ],
        "actual": [
          0
        ]
      },
      {
        "bar": 4,
        "expected": [
          1
        ],
        "actual": [
          0
        ]
      },
      {
        "bar": 8,
        "expected": [
          1
        ],
        "actual": [
          0
        ]
      },
      {
        "bar": 11,
        "expected": [
          1
        ],
        "actual": [
          0
        ]
      }
    ],
    "publicPathMismatchDetails": [
      {
        "bar": 3,
        "expected": [
          1
        ],
        "actual": [
          0
        ]
      },
      {
        "bar": 4,
        "expected": [
          1
        ],
        "actual": [
          0
        ]
      },
      {
        "bar": 8,
        "expected": [
          1
        ],
        "actual": [
          0
        ]
      },
      {
        "bar": 11,
        "expected": [
          1
        ],
        "actual": [
          0
        ]
      }
    ],
    "diagnostics": []
  }
]
```
