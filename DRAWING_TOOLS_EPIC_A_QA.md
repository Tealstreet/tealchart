# Drawing Tools Epic A QA — Browser Evidence

Epic A's open item in `DRAWING_TOOLS_PLACEMENT_AUDIT.md` was "Browser/device smoke
with sidebar tool" for the north-star placement tools — real pointer gestures in a
consuming product shell rather than unit-level event routing. This document records
that browser pass.

## Method

Driven through the Premys web product shell (`react-native-web`) consuming this
package from source, using Chrome to dispatch real DOM pointer/mouse gestures:
sidebar category → tool selection, then `mousedown` (container) → `mousemove`
(window, above the drag threshold) → `mouseup` (window). Each placement was
confirmed visually (shape geometry matches the gesture endpoints) and via toolbar
state (`Cancel draft drawing` / `Undo` enable/disable). Web Canvas only; mobile
Skia parity is covered by the existing component/render-model tests and is flagged
below as a remaining device gap.

## Placement Results

| Tool | Mode | Browser result |
| --- | --- | --- |
| `trendLine` | dragTwoAnchor | Line committed at exact drag endpoints. |
| `rectangle` | dragTwoAnchor | Rectangle committed at exact drag corners; single click is a no-op (no one-anchor draft left behind). |
| `circle` | dragTwoAnchor | Circle inscribed in the drag box; aspect preserved. |
| `ellipse` | dragTwoAnchor | Ellipse fills the drag box (not forced circular). |
| `priceRange` | dragTwoAnchor | Measurement box with live price delta label (`+Δ (+%)`). |
| `datePriceRange` | dragTwoAnchor | Measurement box with both price delta and bar/time delta (`N bars, D days`). |
| `longPosition` | dragSeed + final tap | Seed drag previews a draft (`Cancel draft` enables); final tap commits. See note. |
| `brush` | pathDrag | Freehand stroke follows the full move path. |
| `textLabel` | click | Single tap commits a text anchor immediately (no draft); edit-text action enabled. |

Single-click no-op was verified for a drag-only tool (`rectangle`): clicking without
a drag leaves no draft and creates no surprise shape.

### longPosition gesture semantics (verified, not a bug)

Placement maps `points[0]=entry` (drag start), `points[1]=target` (drag end),
`points[2]=stop` (final tap); render (`resolveRiskRewardPositionFromAnchors`) is
faithful to those anchors. Dragging the entry→target leg **downward** and tapping
the stop **above** produces an inverted long (reward below, risk above) — the tool
draws exactly what the gesture describes. A canonical long (drag entry→target up,
tap stop below) renders correctly: green reward above, red risk below, reward
positive. No placement defect.

## Undo / Cancel

- `Undo drawing command` removes a committed drawing and enables `Redo`.
- A dragSeed draft (`longPosition`) is cancelled by `Escape` (and the `Cancel draft
  drawing` button), leaving no committed drawing.

## Object tree

`Open drawing object tree` surfaces a "Drawings (N)" panel grouped by pane (MAIN
CHART) with per-drawing Name / Hide / Lock / Copy / Del / Up / Down / Top / Back
actions. Discoverable and complete for the smoke case.

## Reproduced UX defect + fix: selected-action toolbar covered the legend

Selecting a drawing whose top sits near the chart top rendered the floating
selected-action toolbar **over the symbol/OHLC legend**, obscuring live O/H/L/C
values — a violation of the North Star ("overlays avoid important chart content
such as symbol/indicator legends").

Root cause: `resolveUserDrawingActionSurfacePosition` clamped only to a scalar top
inset (`topBarHeight + 6`), which lands inside the legend band; it ignored the
legend rectangle that `computeTopLeftLegendRect` already describes.

Fix (shared, both platforms): the resolver now accepts `avoidRects` and drops the
surface below any rectangle it would overlap. Web (`ChartTopBar`) and mobile
(`UserDrawingSelectedActionSurface`) both pass the legend rect from
`computeTopLeftLegendRect`. Verified live: the toolbar now renders below the legend
(top ≈ 202 vs legend bottom ≈ 172) and the O/H/L/C values stay readable. Covered by
`toolbar.test.ts` and `ChartTopBar.test.ts`.

## Remaining manual gaps

- **Mobile device smoke.** All tools above were smoked on web Canvas only. Mobile
  Skia parity rests on component/render-model tests; on-device gesture smoke is
  still unrun.
- **Mobile legend avoidance is wired but inert.** `MOBILE_CHART_CHROME_METRICS`
  declares no top-left legend rect (`topLeftLegendWidth: 0`), so
  `computeTopLeftLegendRect` returns `null` and the mobile surface has nothing to
  avoid. If/when the mobile shell renders a top-left legend, populate those metrics
  and the same shared avoidance engages automatically.
