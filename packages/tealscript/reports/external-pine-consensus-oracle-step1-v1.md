# External Pine Consensus Oracle Step 1 V1

Date: 2026-09-12

Purpose: vet the three proposed external Pine implementations before building a
TealScript-vs-external differential runner.

Measurement commit: `ff5542bf28`.

## Decision

Go for a small pilot runner.

Two of the three proposed external voters can run native Pine source against
supplied deterministic OHLCV and emit per-bar plot values programmatically:

- PineTS.
- Pine-A-Script.

PyneCore is not a local raw-Pine voter in this setup. The installed open package
runs compiled PyneCore Python scripts locally, but raw `.pine` execution routes
through the PyneSys compiler API and requires a PyneSys API key.

## Inputs

Known-value script:

```pine
//@version=6
indicator("value vector")
plot(ta.sma(close, 3), "s")
```

Bars: the deterministic `BARS` shape from `run-pine-value-vectors.ts`, with
close values:

```json
[10,11,13,12,14,15,13,16,18,17,19,20]
```

Hand-derived expected `ta.sma(close, 3)`:

```json
[null,null,11.333333333333334,12,13,13.666666666666666,14,14.666666666666666,15.666666666666666,17,18,18.666666666666668]
```

Real corpus smoke script:

- `packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911/sources/0115__lebinhchieu-tradingview__ema-vol.pine`
- Declared version: v6.
- Source: `lebinhchieu/tradingview`, `ema-vol.pine`, pinned in the v6 corpus
  manifest.

## Voter Results

| Voter | Version / commit | Known-value script | Real corpus source | Supplied bars | Per-bar plot output |
| --- | --- | --- | --- | --- | --- |
| PineTS | npm `pinets@0.9.33`; cloned repo `1fdcf4ab5f8994046f1a95eb741d0fec00e34328` | Pass | Pass | Pass | Pass |
| Pine-A-Script | cloned repo `6f9e99cd0a0bc895ac661cbfbe2c9ae1fa0df2c9` | Pass | Pass | Pass | Pass |
| PyneCore | `pynesys-pynecore==6.9.3` | No local raw-Pine execution | No local raw-Pine execution | File input supported after compilation | Plot CSV supported after compilation |

### PineTS

PineTS accepted native v6 Pine source through `new PineTS(data).run(source)`.

Known-value result:

- plot key: `s`.
- emitted twelve per-bar values.
- numeric values matched the hand-derived vector within ordinary float
  tolerance.

Real corpus result:

- accepted the v6 `ema-vol` corpus source as-is.
- emitted named plot payloads from supplied bars, including `MA 20`, `MA 50`,
  `MA 100`, `MA 200`, `VWAP Session`, `VWAP Week`, and `VWAP Month`.

### Pine-A-Script

Pine-A-Script accepted native Pine source through `transpile(source)`, dynamic
import of the generated module, then `run(data)`.

Known-value result:

- plot key: `s`.
- emitted twelve per-bar values.
- numeric values matched the hand-derived vector within ordinary float
  tolerance.

Real corpus result:

- accepted the v6 `ema-vol` corpus source.
- emitted a per-bar plot payload from supplied bars.
- the emitted corpus plot title normalized poorly (`[object Object]`), so the
  pilot normalizer should key by stable plot order when titles are missing or
  malformed.

### PyneCore

Installed package: `pynesys-pynecore[cli]`.

CLI evidence:

- `pyne run --help` says `.pine` files are automatically compiled to Python
  before execution.
- The same help text says a valid PyneSys API key is required for Pine Script
  support.
- `pyne compile --help` says compilation uses the PyneSys API.

Concrete no-key attempt:

```text
pyne --workdir ... run sma.pine bars.csv --plot plots.csv
```

Result:

```text
Script file '.../sma.py' not found!
```

That matches the documented boundary: without an API key or precompiled
PyneCore Python file, PyneCore cannot accept real raw corpus Pine source.

## Step 1 Conclusion

The approach does not die at Step 1 because two independent external
implementations satisfy the required mechanics on both a known-value vector and
a real corpus source:

- accept Pine source;
- execute against supplied deterministic OHLCV;
- emit per-bar plot values programmatically.

Next build step, if approved: a small pilot runner over about 25 v5/v6 scripts
using identical committed bars and one shared normalizer. Consensus-derived
oracles from that runner should tag provenance as `external-consensus`.
