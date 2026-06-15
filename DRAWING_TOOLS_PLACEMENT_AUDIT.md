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
| `trendLine` | Drag two anchors, click two anchors | `placement.test.ts`, `input.test.ts` endpoint test | `EventManager.test.ts`, `TealchartWidget.test.ts` exact endpoint drag/input routing | `drawingCommands.test.ts` endpoint test | Browser/device smoke with sidebar tool |
| `rectangle` | Drag two anchors, click two anchors | `placement.test.ts`, `input.test.ts` endpoint/cancel tests | `ChartCore.test.ts`, `EventManager.test.ts`, `TealchartWidget.test.ts` exact endpoint undoable drag placement and host mouse routing | `SkiaTealchart.test.tsx`, `EventManager.test.ts`, `drawingCommands.test.ts`, `drawingRenderModel.test.ts` toolbar-selected mocked touch drag endpoint parity and host touch routing | Browser/device smoke with sidebar tool |
| `circle` | Drag two anchors, click two anchors | `placement.test.ts`, `input.test.ts` endpoint test | `TealchartWidget.test.ts` exact endpoint drag placement | `drawingCommands.test.ts`, `drawingRenderModel.test.ts` Skia primitive tests | Browser/device smoke with sidebar tool |
| `ellipse` | Drag two anchors, click two anchors | `placement.test.ts`, `input.test.ts` endpoint test | `TealchartWidget.test.ts` exact endpoint drag placement | `drawingCommands.test.ts`, `drawingRenderModel.test.ts` Skia primitive tests | Browser/device smoke with sidebar tool |
| `priceRange` | Drag two anchors, click two anchors | `placement.test.ts`, `input.test.ts` endpoint test | `TealchartWidget.test.ts` exact endpoint drag placement | `drawingCommands.test.ts`, `drawingRenderModel.test.ts` Skia primitive tests | Browser/device smoke with sidebar tool |
| `datePriceRange` | Drag two anchors, click two anchors | `placement.test.ts`, `input.test.ts` endpoint test | `TealchartWidget.test.ts` exact endpoint drag placement | `drawingCommands.test.ts` endpoint test | Browser/device smoke with sidebar tool |
| `longPosition` | Drag seeds first two anchors, final tap commits | `placement.test.ts`, `input.test.ts` drag-seed test | `TealchartWidget.test.ts` drag-seed widget test | `drawingCommands.test.ts`, `drawingRenderModel.test.ts` risk/reward render tests | Browser/device smoke with sidebar tool |
| `brush` | Path drag | `input.test.ts` path-drag smoothing/commit tests | `TealchartWidget.test.ts` path-family drag test | `drawingCommands.test.ts`, `drawingRenderModel.test.ts` pressure/render tests | Browser/device smoke with sidebar tool |
| `textLabel` | Single-anchor click/tap | `input.test.ts` single-anchor and text-edit state tests | `TealchartWidget.test.ts` context/double-click edit tests | `drawingCommands.test.ts`, `drawingRenderModel.test.ts` text edit/render tests | Browser/device smoke with sidebar tool |

## Phase A1 Findings

- The current shared placement model does not create arbitrary second anchors
  for the audited two-anchor tools. Drag placement commits use the drag start
  and drag end anchors exactly.
- Web and mobile both route drawing placement through shared commands/history.
  Mobile has explicit command-history coverage for the same endpoint semantics.
- The host event boundary has unit coverage for both web mouse and touch-like
  input: `EventManager.test.ts` verifies pending drag promotion, final
  mouseup/touchend delivery when RAF has not processed a move frame, below
  threshold tap fallback, pressure forwarding, shift modifier forwarding, and
  touchcancel cancellation paths.
- Web widget-level tests now cover exact drag endpoints and undo restoration
  for the north-star two-anchor tools: `trendLine`, `rectangle`, `circle`,
  `ellipse`, `priceRange`, and `datePriceRange`.
- Web and mobile toolbar tests both exercise the rendered drawing-tool
  categories for the audited placement tools: `trendLine`, `rectangle`,
  `circle`, `ellipse`, `priceRange`, `datePriceRange`, `longPosition`,
  `brush`, and `textLabel`. This covers the sidebar-selection side of the
  reported rectangle workflow and prevents common placement tools from dropping
  out of the first-party drawing rail on either platform.
- Web widget-level placement coverage now also starts from the widget UI
  toolbar `rectangle` selection callback, verifies `toolbar` command metadata,
  and then commits exact drag endpoints.
- Mobile Skia component coverage now exercises the rendered drawing toolbar and
  verifies `Rectangle` selection reaches Skia drawing state with `toolbar`
  command metadata.
- Mobile Skia component coverage now also drives the mocked Pan gesture
  lifecycle after rendered toolbar `Rectangle` selection and verifies the
  begin/commit commands resolve concrete expected anchors from the touch
  coordinates and that the committed drawing uses those anchors rather than a
  generated size.
- The earlier "random rectangle" concern should be treated as a UI regression
  only if reproduced through the sidebar/pointer path. The shared state layer
  currently behaves correctly.

## Follow-Up Order

1. Add a lightweight browser/device smoke harness for sidebar tool selection
   plus pointer/touch drag, because the remaining risk is real browser/native
   integration rather than unit-level event routing, state mutation, toolbar
   selection, Skia gesture callbacks, or render-model geometry.
2. Move to Epic B once the smoke path is covered or manually verified:
   selected-object local action surface.
3. Keep placement fixes narrow. If a tool regresses, fix the web pointer path
   and mobile touch path in the same PR.
