# TradingView v24 capture handoff v2

Canonical shared manifest: bundle-manifest-v2.json (five sources, one bundle). Tuple and overload contributions were combined under the shared v3-bundle.lock. All assets remain uncommitted for Overseer shipping. Native outcomes stay unobserved except the prior exact shared64 control provenance carried separately in the manifest.

Tuple-accounting sources retain VMP ownership, unchanged hashes/instructions and the exact native-v10 shared64 source SHA 7d0f86049693210a22628f71ee8a248c4287d982fb16499c2334306778eb74ea. The different64+64 policy remains held for native evidence.

BK overload sources test const against simple/series, const-only, and a unique-series control. Run separately because a compiler refusal must not suppress another case. Native phase, selected overload and diagnostic are UNSPECIFIED/UNOBSERVED. The engine preflight currently emits missing values for the first case and 303/203 for the others; those are instrument results and do not predict TV behavior. Ledger1815 remains an OPEN DEFECT (silent output loss) and is not closed by the accepted test-only c925 cert.

Follow instructions/<source-stem>.md. Return exact source/outcome/CSV/context/screenshot identities in captures/v24/RESPONSE-v24.md. Preserve missing values, unexpected diagnostics and third outcomes. Check shipping assets with `sha256sum -c SHA256SUMS`; SHIP-FILES-v2.txt is the shipping list. Local runners, logs and preflight reports stay in the archive, outside this bundle.
