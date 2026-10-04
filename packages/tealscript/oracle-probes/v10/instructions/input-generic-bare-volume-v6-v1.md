# input-generic-bare-volume-v6-v1.pine capture instructions v1

Source SHA256: 76040577a1a98568306699adf575323cd9511743bbf1adb9ac7fef0d40e847d3. Owner codex-g6qooy; recipient codex-6y3sjh.

Does v6 generic input(volume,...) compile or refuse? Existing v56:384 admission is retained; close*2 refusal does not settle bare volume.

Use BINANCE:BTCUSDT, 2-minute standard candles, UTC. Load these exact bytes without rewriting the call. Record compilation status. If refused, capture editor error text/code/line/column and screenshot. If it runs, export raw CSV with OUTCOME, capture logs and source identity. For the source-metadata probe, additionally save native user_input_metadata JSON plus Inputs/tooltip/group screenshots showing SLOT3/SLOT4/SLOT5; preserve display.none and active=true. Do not infer metadata from OUTCOME alone.

Native expected phase and values are UNSPECIFIED. Current engine preserves earlier-version admission/order and bare-volume admission; these are compatibility predictions, not native results. Bare volume compile admission only. OUTCOME intentionally uses close so a missing volume feed cannot masquerade as a refusal.


Save evidence under v10/captures/v10/ and record the source hash, attempt, observed phase, diagnostic text/location, chart context, history extent and limitations in v10/captures/v10/RESPONSE-v10.md.
