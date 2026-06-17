# Drawing Tools UX Polish Plan (TradingView-Parity Toolbar Pass)

Directional plan for the drawing-toolbar polish push that follows Epics A–E
(see `DRAWING_TOOLS_NORTH_STAR.md`). Target: the drawing toolbar and selected
-object editing surface should feel like TradingView on both web Canvas and
mobile Skia.

## Standing Rules

- Every user-facing change ships its mobile Skia sibling in the **same PR**.
  No web-only or mobile-only landings.
- One epic = one PR. Per epic: build through phases, then open a PR, run the
  CodeRabbit + sub-agent review loop until clean, admin-merge, cut next branch.
- Live QA each web change against the running app with Chrome MCP
  (http://localhost:8081/chart). Mobile parity proven via shared layer + tests
  (device QA is a recorded follow-up).
- Shared concepts only: tool, descriptor, command, action, surface, anchor.
  Web and mobile consume the same `src/drawings/` model.

## Architecture Baseline (verified 2026-06-16)

- Web chart chrome is imperative DOM built in `ui/ChartTopBar.ts` via a
  `createElement(tag, { style, textContent })` helper; styles are CSS-in-JS
  objects. The left drawing rail is `renderDrawingToolRail()`; category flyouts
  and the inline selected-object controls are also built here.
- Mobile chrome is RN components in `mobile/components/`
  (`ChartTopBarComponent.tsx`, `UserDrawingSelectedActionSurface.tsx`).
- Shared model is `src/drawings/toolbar.ts`: `USER_DRAWING_TOOL_DESCRIPTORS`
  (~100 tools, each `{ tool, icon, label }`), `USER_DRAWING_TOOL_CATEGORY_-
  DESCRIPTORS`, `USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS`, the selected-action
  surface resolver `resolveUserDrawingSelectedActionSurface`, and the position
  resolver `resolveUserDrawingActionSurfacePosition` (chrome-avoid + flip-below
  from Epic B).
- Tool/action icons today are Unicode glyphs (`'╱'`, `'∠'`, `'⟷'`). There is no
  SVG icon system.
- State fields `stayInDrawingMode` (default false) and `magnetMode`
  (`off|weak|strong`, default off) exist with setters in `drawings/input.ts`;
  toolbar actions `lockAll`/`unlockAll`/`hideAll`/`showAll`/`clearAll` exist.
  None are surfaced as rail toggle UI yet.
- Favorites (individual starred tools, a quick-access bar) do not exist; only
  per-category pin + recent-tool memory exist.

## Epics

### Epic F: SVG Icon System — DONE (PR pending)

Replace emoji-glyph tool/action icons with a proper SVG line-icon system that
renders sharp, TradingView-like marks on web and mobile.

- F1 — Icon registry + render primitives. Added a shared, platform-neutral
  registry `drawings/icons.ts` (`DRAWING_ICONS`, geometry-only nodes; resolvers
  `resolveDrawingToolIconName` / `resolveDrawingToolbarActionIconName`). Web:
  `renderDrawingIcon` in `ui/dom.ts` builds an inline `<svg>`. Mobile:
  `mobile/components/DrawingToolIcon.tsx` renders the same nodes via
  `react-native-svg`. Resolution is keyed by tool/action id, so authored tools
  get SVG and the long tail falls back to the descriptor glyph.
- F2 — Authored core set (~40 icons): cursor/crosshair, lines, channels,
  shapes, measure/position, fib/fork, brushes/annotations, arrow marks,
  patterns, plus shared semantic icons (eye/lock/trash/copy/star/magnet/
  pencil/layer/etc.) reused by toolbar actions.
- F3 — Wired web rail category buttons + flyout items and the mobile top bar to
  render SVG with glyph fallback. Live web QA: all 11 category buttons + the
  Lines flyout render SVG (0 glyph fallbacks on the default rail). Tests:
  `drawings/icons.test.ts` (registry integrity + resolver coverage), updated
  web/mobile top-bar tests. Mirror gate excludes `src/mobile/**`; the mobile
  sibling is typecheck-verified in the premys consumer.
- F4 (review pass) — Wired toolbar **action** icons too via shared
  `resolveDrawingSelectedActionIconName` / `resolveDrawingToolbarActionIconName`:
  global toolbar actions (undo/redo/measure/zoom/clear/hide/show/lock/unlock)
  and the selected-object action buttons render SVG on both web (`ChartTopBar`)
  and mobile (`ChartTopBarComponent` + `UserDrawingSelectedActionSurface`).
  `star` is filled. Live web QA: the action toolbar row is fully iconified.

### Epic G: Floating Selected-Object Popover (web parity with mobile)

Show ALL selected-drawing controls as a floating popover anchored above the
drawing, not injected into the top bar (per product direction).

Scoping (verified 2026-06-16): the floating overlay **already exists** on web
(`ChartTopBar.renderSelectedActionSurface`, `position:absolute` z-index 8,
mounted to `drawingOverlayParent`, positioned via
`resolveUserDrawingActionSurfacePosition` with chrome-avoid + flip-below) and on
mobile (`UserDrawingSelectedActionSurface.tsx`). It renders the high-level
object actions (duplicate, delete, copy, arrange, visibility) + a `style`
popover group. The redundant part is the **inline style/text controls still
injected into the top bar** by `renderDrawingToolbar()` (line color, width,
style, opacity, fill, icon, full text formatting — ChartTopBar.ts ~1257-1903).
So Epic G is migration/removal, not greenfield.

- G1 — VERIFIED (2026-06-16): `resolveUserDrawingSelectedStyleActionSurfaceGroup`
  (toolbar.ts:1237) already builds the full style/text set as a popover group:
  line color, line width, line style, line visibility, opacity, fill color, fill
  visibility, fill opacity, text color, font size +/-, font family/weight/style,
  text wrap, text max-width, labels visible, text align, trend-line extend, icon
  name — matching the inline top-bar block one-for-one. No resolver gap; G2 is a
  clean removal of the inline block.
- G2 — DONE (2026-06-16): removed the inline selected-object style/text block
  from `renderDrawingToolbar()` (web `ChartTopBar.ts`) and the matching
  `{selectedDrawing && (...)}` block from the mobile top bar
  (`ChartTopBarComponent.tsx`), plus all now-dead imports/consts. The top bar
  keeps only the tool rail + global actions; per-object styling lives solely in
  the floating surface. Tests: web `ChartTopBar.test.ts` style tests migrated to
  drive the floating style popover (inline halves stripped); pure-inline
  component tests deleted (per-kind capability is owned by `toolbar.test.ts` +
  `capabilityMatrix.test.ts`); mobile inline-style component tests deleted (the
  mobile surface is the separate `UserDrawingSelectedActionSurface`, covered by
  its own test). Full suite 1845 pass; package + premys consumer typecheck clean.
- G3 — DONE (2026-06-16): live Chrome MCP QA — drew a trend line, confirmed the
  floating surface anchors above the drawing with the full style popover (line
  color/width/style, opacity, visibility, trend-line extension) and zero inline
  style controls leaking into the top bar. Floating-surface positioning/tracking
  was already delivered in Epic B (chrome-avoid + flip-below).

### Epic H: Drawing Tool Favorites — DONE (2026-06-16)

- H1 — DONE. `favoriteTools: readonly UserDrawingTool[]` on UserDrawingState
  (mirrors stayInDrawingMode/magnetMode): set/toggle commands, non-undoable +
  preserved across undo/redo, persisted in layout serialization, resolvers
  `getUserDrawingFavoriteTools`/`isUserDrawingToolFavorite`. Persistence rides
  the existing `onUserDrawingStateChange` + serialize/deserialize — no new
  host callback.
- H2 — DONE. Star toggle on every flyout tool row (web + mobile). Critical
  fix: `getUserDrawingToolbarStateKey` now includes favorites so a toggle
  re-renders the memoized top bar (only live QA caught this — unit tests
  construct ChartTopBar directly and bypass the UI memo gate).
- H3 — DONE. Horizontal floating favorites bar, **draggable** to reposition,
  shown only when favorites exist (per product choice 2026-06-16: floating
  horizontal, not a vertical rail section). Position is state-backed
  (`favoriteToolbarPosition`), so it survives re-renders and reloads. Web uses
  pointer drag with overlay clamping; mobile uses gesture-handler Pan +
  reanimated (OrderLine idiom). Live web QA: render + drag + persist verified.

### Epic I: Bottom-Rail Toolbar Toggles

Surface the rail toggles shown in TradingView's drawing rail: magnet/snap,
keep-drawing (stayInDrawingMode), lock-all, hide-all, and clear-all (trash).

- I1 — DONE (2026-06-16). Magnet (snap) + keep-drawing (stayInDrawingMode)
  toggle buttons at the bottom of the vertical drawing rail, web + mobile.
  Magnet toggles off↔strong; keep-drawing toggles the boolean; both show
  active state. New callbacks `onUserDrawingMagnetModeChange` /
  `onUserDrawingStayInDrawingModeChange` threaded ChartTopBar →
  TealchartWidgetUI → TealchartWidget (existing setUserDrawingMagnetMode /
  setUserDrawingStayInDrawingMode setters); mobile via SkiaTealchart dispatch.
  `getUserDrawingToolbarStateKey` now includes magnetMode + stayInDrawingMode
  so a toggle re-renders the memoized rail (same gate as favorites). Tests
  web + mobile; live web QA confirms toggle + active state.
- I2 / I3 — DONE (2026-06-17, per product decision to relocate). lock-all,
  hide-all/show-all, and clear-all moved out of the top action row into the
  bottom of the vertical drawing rail (web + mobile). Each renders as a single
  state-aware toggle (lock↔unlock, hide↔show, reflecting + flipping on
  all-locked / all-hidden) and is disabled when there are no drawings. Clear-all
  gains a destructive confirm step (web `confirm()`, mobile `Alert.alert`).
  Shared `isUserDrawingRailToolbarAction` predicate splits the five actions out
  of the top row; the memo state key already tracks has-locked/has-hidden/
  drawings.length so no key change was needed. Tests web + mobile; live web QA
  confirmed render, enable/disable, toggle flip + active state, and the
  clear-all confirm (accept clears, cancel does not).

### Epic J: Long-Tail SVG Icon Coverage — DONE (2026-06-17)

Authored SVG geometry for the ~55 remaining drawing tools that fell back to
Unicode glyphs, so the **entire** tool palette renders sharp line-icons on web
and mobile (shared `drawings/icons.ts` registry — adding a tool key auto-enables
both platforms via `resolveDrawingToolIconName`). Families covered: info/
projection (infoLine, forecast, projection, sector), the full Fibonacci set
(extension, trend-based extension, fan, speed-resistance fan, arcs, speed-
resistance arcs, circles, wedge, spiral, channel, time zone, trend-based time),
Gann (fan, box, square, square-fixed), pitchfork variants (schiff, modified
schiff, inside, pitchfan), harmonic/Elliott patterns (ABCD, XABCD, cypher, three
drives, head-and-shoulders, impulse, corrective, double/triple combo, triangle),
volume/VWAP (anchored VWAP, anchored + fixed-range volume profile), curves/cycles
(curve, double curve, arc, polyline, cyclic lines, time cycles, sine), and
annotations/markers (anchored note, price label, price note, pin, icon, image,
emoji, sticker, balloon, signpost, table). `icons.test.ts` now asserts **zero
glyph fallbacks** across `USER_DRAWING_TOOL_DESCRIPTORS`. Live web QA: rendered a
contact sheet of all 55 in the running app — every one resolves to SVG and reads
as its tool.

## Sequencing & Dependencies

F → (G, H, I) → J. Icons are foundational: G/H/I all render icons, so authoring
the core icon system (F) first avoids re-iconing; J back-fills the long tail once
the structural epics are done. After F, G is highest UX value (selected editing),
then H (favorites), then I (rail toggles), then J (icon completeness).

## Out of Scope / Follow-Ups

- Multi-chart "sync drawings to all charts" (the chain-link rail item) — a
  layout/host concern, not single-chart tealchart; revisit if premys grows
  multi-pane layouts.
- Mobile on-device visual QA of all of the above (shared layer + tests cover
  parity; device pass is a recorded follow-up).
