# V33 component 79 capture v1

Run component-079-discriminator-v33-v1.pine independently on BINANCE:BTCUSDT, 2-minute standard candles, regular session, Etc/UTC, no Bar Replay, default inputs. Load at least 32 closed bars; record actual origin/cutoff/count, account/build and settings. Preserve source bytes; a compiler or runtime refusal is an answer, not a repair instruction. Native phase and values are UNSPECIFIED.

If RUNS, export public chart CSV with time/OHLCV, INDEX and every named VALUE/SRC column at full available precision. INDEX is Pine bar_index, not CSV ordinal. Include the initial INDEX=0 row. If unavailable, mark INITIAL-WINDOW-UNAVAILABLE rather than assigning another row to zero. Exclude live rows from historical values. Retain settings and first/last relevant Data Window screenshots. Record exact error text/code/line/column/first bar when refused. Inaccessible libraries/providers are UNAVAILABLE-LIBRARY/HOST-CONTEXT-HELD, not target refusal. Do not publish or substitute a library.

Exact questions:
- request.security-barmerge-modes: The lookahead_on values match; lookahead_off remains missing at four rows expected confirmed. Inspect the provider bar clocks, chart alignment and availability before choosing real regression versus stale host fixture.

Candidate answers: compile refusal (later runtime facet unobserved), runtime refusal with exact first bar, RUNS with helper-model cells, RUNS with saved T cells, or RUNS with a third/ambiguous result. Compare every listed mismatch, startup and recovery separately. Neither model is an expected native answer. Empty/NA is a captured value, not a successful match by itself. The candidate cells below are archival comparison models, not native predictions.

Chart-context discriminator only. Builtin implicit chart OHLC/volume/time cannot be replaced by the archived synthetic fixture. These exact synthetic components remain NATIVE-PENDING unless exported inputs independently match; do not infer closure from a different chart sequence.

 Explicit adaptation: archived synthetic TEST provider is replaced with the chart ticker only in this new discriminator source. Export chart and requested daily context from the public UI if accessible. This settles only observable same-symbol barmerge behavior; the archived six-bar TEST provider fixture remains HOST-PROVIDER-UNREPRODUCIBLE. No exact original-source/provider closure credit. Explicit source arguments are synthetic and SRC columns authenticate their holes; implicit high/low/volume/time operands still come from the real chart. This can isolate source publication facets but does not reproduce archived synthetic OHLCV recurrence.

Candidate models v2

In the following archival rows, expected means the old independent helper, and actual means saved T engine output. Neither is authoritative. Output arrays retain original source column order. Split probes evaluate only their isolated expression; ignore unrelated original columns. For chart-context probes, these synthetic-fixture cells cannot be directly matched to real-chart cells: exact original-input adjudication stays held. Record public chart outputs for a later same-input comparison instead.

```json
[
  {
    "id": "request.security-barmerge-modes",
    "originalSourceSha256": "c8df60c7a503be11c3450440623edd91139a84187f6c0a40749fbbdf34729047",
    "originalBarsSha256": "8660cd7c62634b0329399519c8525e68fb3f4d70febe5d115b2c9bb6307405f7",
    "compiledMismatchDetails": [
      {
        "bar": 2,
        "expected": [
          12,
          12,
          14,
          14
        ],
        "actual": [
          null,
          null,
          14,
          14
        ]
      },
      {
        "bar": 3,
        "expected": [
          12,
          null,
          14,
          null
        ],
        "actual": [
          null,
          null,
          14,
          null
        ]
      },
      {
        "bar": 4,
        "expected": [
          14,
          14,
          16,
          16
        ],
        "actual": [
          null,
          null,
          16,
          16
        ]
      },
      {
        "bar": 5,
        "expected": [
          14,
          null,
          16,
          null
        ],
        "actual": [
          null,
          null,
          16,
          null
        ]
      }
    ],
    "publicPathMismatchDetails": [
      {
        "bar": 2,
        "expected": [
          12,
          12,
          14,
          14
        ],
        "actual": [
          null,
          null,
          14,
          14
        ]
      },
      {
        "bar": 3,
        "expected": [
          12,
          null,
          14,
          null
        ],
        "actual": [
          null,
          null,
          14,
          null
        ]
      },
      {
        "bar": 4,
        "expected": [
          14,
          14,
          16,
          16
        ],
        "actual": [
          null,
          null,
          16,
          16
        ]
      },
      {
        "bar": 5,
        "expected": [
          14,
          null,
          16,
          null
        ],
        "actual": [
          null,
          null,
          16,
          null
        ]
      }
    ],
    "diagnostics": []
  }
]
```
