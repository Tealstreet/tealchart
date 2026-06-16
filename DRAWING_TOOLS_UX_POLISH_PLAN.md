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

Show selected-drawing actions as a floating popover anchored above the drawing,
not injected into the top bar (per product direction). Mobile already has a
surface; bring web to parity and unify on the shared surface model.

- G1 — Web floating popover host. New DOM overlay built from
  `resolveUserDrawingSelectedActionSurface` + positioned by
  `resolveUserDrawingActionSurfacePosition`, clamped to chart bounds, chrome
  -avoiding, flip-below when blocked.
- G2 — Remove the inline top-bar selected-object controls; route the same
  commands through the popover. Keep keyboard/object-tree paths intact.
- G3 — Mobile parity audit + the "more" overflow menu; shared QA.

### Epic H: Drawing Tool Favorites

- H1 — Favorites data model. `favoriteTools: UserDrawingTool[]` in drawing
  state with toggle/set commands (mirrors stayInDrawingMode/magnetMode), plus a
  change callback so the consumer persists (premys: localStorage).
- H2 — Star toggles in category flyout rows (web + mobile).
- H3 — Horizontal favorites quick-access bar surfacing starred tools (web +
  mobile), with empty-state and overflow behavior.

### Epic I: Bottom-Rail Toolbar Toggles

Surface the rail toggles shown in TradingView's drawing rail: magnet/snap,
keep-drawing (stayInDrawingMode), lock-all, hide-all, and clear-all (trash).

- I1 — Magnet + keep-drawing toggles (state exists; render rail buttons +
  active state, wire setters) web + mobile.
- I2 — Lock-all / unlock-all and hide-all / show-all toggle buttons reflecting
  aggregate state, web + mobile.
- I3 — Clear-all (trash) confirm flow; tooltip/hover labels; QA.

## Sequencing & Dependencies

F → (G, H, I). Icons are foundational: G/H/I all render icons, so authoring the
icon system first avoids re-iconing. After F, G is highest UX value (selected
editing), then H (favorites), then I (rail toggles).

## Out of Scope / Follow-Ups

- Multi-chart "sync drawings to all charts" (the chain-link rail item) — a
  layout/host concern, not single-chart tealchart; revisit if premys grows
  multi-pane layouts.
- Full SVG coverage of the long-tail ~100 tools (Gann, fib, pitchfork variants,
  patterns) — authored opportunistically; glyph fallback meanwhile.
- Mobile on-device visual QA of all of the above (shared layer + tests cover
  parity; device pass is a recorded follow-up).
