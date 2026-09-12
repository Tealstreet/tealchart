# Pine TradingView Terminal Queue V1

Date: 2026-09-12

## Purpose

Single entry point for work that needs Sam at a TradingView terminal. This does
not replace the detailed runbooks; it tells Sam what to run first, what each
buy settles, and where to go for paste-ready scripts and import commands.

Detailed runbooks:

- Compile acceptance: `pine-compile-evidence-request-v1.md`
- Value traces: `pine-trace-purchase-order-v2.md`

Related entry points:

- Overall parity state and operating rules: `../PINE_PARITY_STATE.md`
- Corpus acceptance and reconstruction: `../PINE_CORPUS_BRIEFING.md`
- Corpus-ranked build targets: `pine-corpus-priority-queue-v1.md`
- Rule 6 external-oracle register: `pine-rule6-backward-audit-v8.md`

## Recommended Order

| Order | Ask | Terminal cost | Buys | Why here |
| ---: | --- | --- | --- | --- |
| 1 | Trace purchase 1: TA interior-hole policy | 1 Pine paste, 1 chart-data CSV export, 1 importer command | Settles 7 TA functions across 66 of 2,000 measured scripts: `ta.crossover`, `ta.crossunder`, `ta.cross`, `ta.bb`, `ta.rsi`, `ta.stoch`, `ta.vwap` | Best value per minute. It is one static export, no live waiting, and resolves the hottest unsettled value policy. |
| 2 | Compile evidence P0A-P0E | 5 Pine pastes | Settles 123 corpus-used accepted-surface rows where TradingView may accept syntax our committed snapshot missed | Same Pine Editor workflow as purchase 1, no realtime observation, and highest exposure acceptance risk. |
| 3 | Compile evidence P0S-A/P0S-B/P0S-C | 3 Pine pastes | Settles 28 inverse-risk rows TealScript accepts but the live callable bundle does not document | Same sitting as P0A-P0E if time remains; answers the over-acceptance direction without relying on incomplete docs. |
| 4 | Compile evidence isolated Q1-Q6 | 18 Pine pastes | Settles the remaining unclassified census, invalid-cluster, and grammar-production questions | Still acceptance-only and pasteable, but lower value per paste than the batched work because each question must stay isolated. |
| 5 | Trace purchase 2: realtime barstate | 1 live Pine Logs recording and importer command | Settles live `barstate.isnew` and `barstate.isrealtime` behavior for 36 of 2,000 scripts | Highest remaining trace exposure, but it requires waiting for repeated same-bar updates and a bar transition. |
| 6 | Trace purchase 3: `timenow` | 1 live/reload Pine Logs recording and importer command | Settles wall-clock execution-time behavior for 35 scripts | Nearly the same exposure as barstate but slightly lower, and still requires realtime observation. |
| 7 | Trace purchase 4: realtime `varip` replacement | 1 live Pine Logs recording and importer command | Settles replacement-sensitive `varip` rollback escape for 19 scripts | Lower measured exposure, but high consequence because wrong behavior is silent live-value drift. |

## Sitting Plan

First sitting, if Sam has one uninterrupted TradingView session:

1. Run trace purchase 1 from `pine-trace-purchase-order-v2.md`.
2. Run compile evidence P0A-P0E from `pine-compile-evidence-request-v1.md`.
3. If still in the flow, run P0S-A/P0S-B/P0S-C from the same compile runbook.

That is one static export plus 8 compile pastes. It settles the highest value
value trace and all batched acceptance questions in both directions.

Second sitting:

1. Run the isolated compile questions Q1-Q6.
2. Run realtime trace purchases 2, 3, and 4 when a live liquid market is open
   and repeated same-bar Pine Logs updates are available.

## What Not To Do

- Do not use compile success as value parity evidence. Compile evidence answers
  source acceptance only.
- Do not use a historical chart-data CSV for realtime purchases 2-4. Those need
  Pine Logs because repeated live executions of the same bar are the point.
- Do not change declared Pine versions in paste scripts. Each question is
  version-specific.
- Do not remove or tighten TealScript behavior from documentation silence alone;
  rejected compiler evidence is the removal signal.
