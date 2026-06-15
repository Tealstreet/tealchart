# Drawing Tools Placement Audit

Phase A1 records what the current placement stack proves for the core
north-star tools. This document is an evidence map, not a claim that the UI is
fully TradingView-grade.

## Scope

Tools audited here:

- `trendLine`
- `rectangle`
- `circle`
- `ellipse`
- `priceRange`
- `datePriceRange`
- `longPosition`
- `brush`
- `textLabel`

## Current Placement Model

| Tool | Placement mode | Shared evidence | Web evidence | Mobile evidence | Remaining proof |
| --- | --- | --- | --- | --- | --- |
| `trendLine` | Drag two anchors, click two anchors | `placement.test.ts`, `input.test.ts` endpoint test | `EventManager.test.ts`, `TealchartWidget.test.ts` drag/input routing | `drawingCommands.test.ts` endpoint test | Manual pointer/touch smoke with sidebar tool |
| `rectangle` | Drag two anchors, click two anchors | `placement.test.ts`, `input.test.ts` endpoint/cancel tests | `ChartCore.test.ts`, `TealchartWidget.test.ts` undoable drag placement | `drawingCommands.test.ts`, `drawingRenderModel.test.ts` draft/commit render parity | Manual pointer/touch smoke with sidebar tool |
| `circle` | Drag two anchors, click two anchors | `placement.test.ts`, `input.test.ts` endpoint test | Web routing uses shared drag placement path | `drawingCommands.test.ts`, `drawingRenderModel.test.ts` Skia primitive tests | Manual pointer/touch smoke with sidebar tool |
| `ellipse` | Drag two anchors, click two anchors | `placement.test.ts`, `input.test.ts` endpoint test | Web routing uses shared drag placement path | `drawingCommands.test.ts`, `drawingRenderModel.test.ts` Skia primitive tests | Manual pointer/touch smoke with sidebar tool |
| `priceRange` | Drag two anchors, click two anchors | `placement.test.ts`, `input.test.ts` endpoint test | Web routing uses shared drag placement path | `drawingCommands.test.ts`, `drawingRenderModel.test.ts` Skia primitive tests | Manual pointer/touch smoke with sidebar tool |
| `datePriceRange` | Drag two anchors, click two anchors | `placement.test.ts`, `input.test.ts` endpoint test | Web routing uses shared drag placement path | `drawingCommands.test.ts` endpoint test | Manual pointer/touch smoke with sidebar tool |
| `longPosition` | Drag seeds first two anchors, final tap commits | `placement.test.ts`, `input.test.ts` drag-seed test | `TealchartWidget.test.ts` drag-seed widget test | `drawingCommands.test.ts`, `drawingRenderModel.test.ts` risk/reward render tests | Manual pointer/touch smoke with sidebar tool |
| `brush` | Path drag | `input.test.ts` path-drag smoothing/commit tests | `TealchartWidget.test.ts` path-family drag test | `drawingCommands.test.ts`, `drawingRenderModel.test.ts` pressure/render tests | Manual pointer/touch smoke with sidebar tool |
| `textLabel` | Single-anchor click/tap | `input.test.ts` single-anchor and text-edit state tests | `TealchartWidget.test.ts` context/double-click edit tests | `drawingCommands.test.ts`, `drawingRenderModel.test.ts` text edit/render tests | Manual tap/click smoke with sidebar tool |

## Phase A1 Findings

- The current shared placement model does not create arbitrary second anchors
  for the audited two-anchor tools. Drag placement commits use the drag start
  and drag end anchors exactly.
- Web and mobile both route drawing placement through shared commands/history.
  Mobile has explicit command-history coverage for the same endpoint semantics.
- Web and mobile toolbar tests both exercise `Rectangle` selection from the
  rendered drawing-tool categories. This covers the tool-selection side of the
  reported rectangle workflow.
- The earlier "random rectangle" concern should be treated as a UI regression
  only if reproduced through the sidebar/pointer path. The shared state layer
  currently behaves correctly.

## Follow-Up Order

1. Add a lightweight browser-level smoke harness for sidebar tool selection plus
   pointer drag, because the remaining risk is end-to-end integration routing
   rather than state mutation or toolbar selection.
2. Move to Epic B once the smoke path is covered or manually verified:
   selected-object local action surface.
3. Keep placement fixes narrow. If a tool regresses, fix the web pointer path
   and mobile touch path in the same PR.
