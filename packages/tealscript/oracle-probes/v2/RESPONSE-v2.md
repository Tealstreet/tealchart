# TradingView capture response v2

Bundle revision v3. Fill this response; leave HANDOFF-v2.md unchanged.

Batch start/end UTC: 

|Probe/attempt|CSV or outcome path|Export UTC|Reset UTC|Observed live open/cutoff|Setup/defaults unchanged|Evidence/gaps|
|---|---|---|---|---|---|---|

Manifest: captures/v2/manifest-v2.json (postprocess-v2.py)
UI notes: captures/v2/capture-notes-v3.json
Outcomes: captures/v2/outcomes-v2.json
Evidence: captures/v2/evidence/<probe>-attempt<N>-<kind>.<ext>

Exact errors: include phase, full text, line/call/argument, failing bar and screenshot path.

Unknown times/indices/header mappings/context availability remain unknown. Partial exports are labelled failed; success values/logs/visual evidence are listed per script in PROBES-v2.md.

When done, commit captures/v2/ and this response to master and push (authorized by Sam, as for v1).
