# Drawing Tools Dimensional Gap Plan

This roadmap orders the missing TradingView-grade drawing dimensions before
adding more drawing shapes. Every user-facing behavior must land for both web
Canvas/DOM and mobile React Native/Skia in the same PR. If a behavior cannot be
completed on both platforms, reduce the scope or do not ship it.

## Platform Parity Gate

Every epic must include:

- Shared drawing state, reducer, command, or render-model work where applicable.
- Web integration through `TealchartWidget`, `ChartCore`, `EventManager`, and
  DOM/canvas drawing UI.
- Mobile integration through `SkiaTealchart`, mobile input utilities, render
  model, and React Native UI surfaces.
- Tests for shared logic plus web and mobile adapters when the epic touches
  platform behavior.
- PR notes that explicitly list web coverage and mobile Skia coverage.

## Recommended Ordering

1. Capability matrix and invariants.
2. Command transaction layer and undo/redo history.
3. Real drawing gesture placement.
4. Selection action surfaces: floating toolbar and context menu.
5. Object tree and layer management.
6. Text/property edit lifecycle.
7. Keyboard and modifier behavior.
8. Public API, events, persistence, and test harness hardening.

The ordering is deliberate: commands/history should exist before complex input
gestures, and selection/action surfaces should consume the same commands before
object tree and advanced property panels build on them.

## Gap 1: Capability Matrix and Invariants

Goal: create the source of truth for supported drawing behaviors, tool placement
modes, action availability, and platform parity.

Tracking artifacts: `DRAWING_TOOLS_CAPABILITY_MATRIX.md` and
`DRAWING_TOOLS_INTERACTION_INVARIANTS.md`.

### Epic 1.1: Drawing Capability Inventory

Phase 1: TradingView category matrix

- Enumerate TradingView drawing categories and known tool families.
- For each tool, record placement mode: one-point, two-point drag/click,
  multi-point click, path/freehand drag, anchored pane position, or special
  computed payload.
- Record required interactions: select, edit handles, move, duplicate, lock,
  hide, z-order, text edit, style controls, alerts/templates if deferred.

Phase 2: Tealchart implementation matrix

- Map each existing `UserDrawingTool` and drawing kind to capability rows.
- Mark status as shipped, scaffolded, partial, missing, or intentionally
  deferred.
- Add explicit web/mobile columns so parity gaps are visible.

Phase 3: PR/epic acceptance checklist

- Add a reusable checklist for drawing PRs.
- Require a "no web-only behavior" review item.
- Require focused tests or an explicit test-gap note for every touched platform.

### Epic 1.2: Drawing Interaction Invariants

Status: documented in `DRAWING_TOOLS_INTERACTION_INVARIANTS.md`.

Phase 1: Shared terminology

- Define terms for command, transaction, draft, preview, selection, text edit,
  toolbar action, context action, object-tree action, and platform adapter.

Phase 2: State ownership contract

- Document which layer owns drawing state on web and mobile.
- Document how UI surfaces dispatch commands without directly mutating state.

Phase 3: Failure and cancellation rules

- Document how Escape/cancel, pane changes, locked drawings, hidden drawings,
  stale IDs, and interrupted gestures behave.

## Gap 2: Command Transactions and Undo/Redo

Goal: route all drawing mutations through undoable command transactions before
adding richer gestures and surfaces.

### Epic 2.1: Shared Drawing Command Layer

Status: shipped for app-facing web widget APIs and mobile Skia imperative
handle APIs. Low-level gesture transaction grouping continues in Epic 2.2.

Phase 1: Command envelope

- Introduce shared command names for create, delete, duplicate, select,
  multi-select, move, edit handle, style update, visibility, lock, z-order,
  text-edit begin/update/commit/cancel, draft begin/update/commit/cancel.
- Include command metadata: source, timestamp, affected IDs, and transaction
  grouping key.

Phase 2: Reducer adapter

- Wrap existing reducers behind command dispatch without changing behavior.
- Preserve existing public APIs by having them dispatch equivalent commands.

Phase 3: Platform owners

- Wire web widget state owner and mobile Skia state owner to the same command
  dispatch contract.
- Add tests proving existing duplicate/delete/z-order/style actions produce the
  same final state through command dispatch.

### Epic 2.2: Drawing Undo/Redo History

Status: shipped for existing committed drawing mutations with web keyboard/API
controls and mobile Skia imperative handle controls. Further validation and
future gesture-specific transaction hardening continues in Epic 2.3 and Gap 3.

Phase 1: Shared history model

- Add drawing-only undo and redo stacks with bounded capacity.
- Store before/after committed drawing state for transaction-level undo.
- Exclude transient hover and preview state from history.

Phase 2: Transaction boundaries

- Group drag gestures into one history entry.
- Group text edit commit into one entry.
- Group multi-select actions like delete/duplicate/z-order into one entry.

Phase 3: Web keyboard/API integration

- Add `Ctrl/Cmd+Z` undo and redo shortcuts on web when chart focus owns drawing
  keyboard input.
- Expose widget APIs for undo/redo drawing commands.

Phase 4: Mobile handle/API integration

- Add matching imperative handle methods for mobile Skia.
- Add mobile-safe command dispatch so app toolbars can trigger undo/redo.

### Epic 2.3: History Validation

Phase 1: Shared tests

- Test undo/redo for create, delete, duplicate, z-order, style, lock/visibility,
  move, handle edit, and text edit commit.

Phase 2: Web adapter tests

- Test keyboard dispatch and focus rules.
- Confirm existing chart shortcuts and pane interactions are not hijacked.

Phase 3: Mobile adapter tests

- Test imperative handle undo/redo.
- Confirm Skia render model reflects restored drawing state.

## Gap 3: Real Drawing Gesture Placement

Goal: replace click-only placement for shape tools with real drawing gestures
while preserving click-to-place workflows where appropriate.

Status: initial slice in progress. Shared placement modes and two-anchor drag
placement commands exist for `trendLine`, `extendedLine`, `infoLine`,
`arrowLine`, `arrowMarker`, `ray`, `rectangle`, `circle`, and `ellipse`; web
Canvas and mobile Skia route those tools through matching drag preview/commit
flows. Event-level web regression coverage now guards click preservation,
mousemove promotion, and mouseup promotion through the pending-drawing path;
mobile command/gesture/render-model regression gates cover the sibling behavior.
Remaining Gap 3 work should expand tool coverage, constraints, and deeper
cancel/pointer-exit harness coverage.

### Epic 3.1: Shared Placement State Machine

Phase 1: Placement mode registry

- Add a shared mapping from tool to placement mode and required anchors.
- Keep this separate from render geometry so behavior can evolve without adding
  shape-specific input branches everywhere.

Phase 2: Draft lifecycle

- Add shared begin/update/commit/cancel placement operations.
- Support preview anchor updates without committing.
- Prevent accidental zero-size or default-size drawings.

Phase 3: Gesture thresholds and constraints

- Define pointer/touch drag thresholds.
- Define Shift constraint hooks for square rectangles, angle snapping, and
  future constrained lines.

### Epic 3.2: Web Drag-to-Draw Adapter

Phase 1: EventManager routing

- Let active drawing tools own pointer down/move/up before pan starts.
- Keep select-mode drag editing behavior intact.

Phase 2: Canvas preview

- Route draft preview anchors into web render entries.
- Ensure chart pan/crosshair resumes after commit/cancel.

Phase 3: First proof tools

- Implement rectangle, trend line, and ellipse drag-to-draw.
- Preserve click-to-place for multi-anchor tools where that matches the
  placement mode.

### Epic 3.3: Mobile Skia Drag-to-Draw Adapter

Phase 1: Touch routing

- Route single-touch active drawing tools through the same placement lifecycle.
- Preserve existing pan and pinch behavior outside active drawing gestures.

Phase 2: Skia preview

- Feed preview anchors into the mobile render model.
- Match web draft opacity, handles, and selected-after-create behavior.

Phase 3: First proof tools

- Implement mobile rectangle, trend line, and ellipse parity in the same PR as
  web.

### Epic 3.4: Placement Tests and Regression Harness

Phase 1: Shared reducer tests

- Verify click, drag, cancel, pane switch, stale draft, and threshold behavior.

Phase 2: Web event tests

- Verify mouse drag creates exact anchors and click does not fabricate size.

Phase 3: Mobile input tests

- Verify touch drag creates exact anchors and Skia previews match committed
  geometry.

## Gap 4: Selection Action Surfaces

Goal: move selected drawing actions out of the chart top bar into drawing-native
surfaces: floating toolbar on selection and context menu on right-click or
long-press.

### Epic 4.1: Shared Selected-Action Model

Phase 1: Action availability model

- Produce selected drawing action descriptors from shared state.
- Include duplicate, delete, lock, hide, z-order, style groups, text edit, and
  tool-specific actions.

Phase 2: Anchor geometry model

- Resolve selected drawing bounds and preferred toolbar anchor point from shared
  render geometry.
- Handle offscreen, multi-select, pane split, and price/time axis clipping.

Phase 3: Command dispatch

- Ensure every toolbar/context action dispatches the command layer from Gap 2.

### Epic 4.2: Web Floating Toolbar

Phase 1: DOM surface primitive

- Add a chart-overlay floating toolbar positioned near selected drawing bounds.
- Keep it transparent to chart layout except for its own hit region.

Phase 2: Initial actions

- Move duplicate/delete/z-order/lock/hide/basic style actions out of the top bar
  into the floating toolbar for selected drawings.

Phase 3: Dismissal and focus

- Dismiss on selection clear, Escape, draft start, or outside click.
- Keep toolbar interactions from causing chart selection misses.

### Epic 4.3: Mobile Selection Action Sheet

Phase 1: Native surface primitive

- Add a mobile drawing action surface, likely a bottom sheet or anchored action
  popover depending on current mobile UI conventions.

Phase 2: Initial actions

- Expose the same selected-action descriptors as web.
- Use mobile-native controls while preserving command semantics.

Phase 3: Dismissal and focus

- Dismiss on selection clear, gesture start, or app-level dismissal.
- Preserve mobile chart pan/zoom outside the action surface.

### Epic 4.4: Drawing Context Menu

Phase 1: Shared context action resolution

- Hit-test the pointer/touch point.
- Select the target if needed, then resolve context actions from shared state.

Phase 2: Web right-click menu

- Show drawing actions on right-click over a drawing.
- Preserve existing chart context menu behavior outside drawings.

Phase 3: Mobile long-press menu

- Show matching drawing actions on long-press over a drawing.
- Preserve existing mobile context menu behavior outside drawings.

## Gap 5: Object Tree and Layer Management

Goal: provide a first-class object tree model for selecting, ordering, locking,
hiding, and managing drawings.

### Epic 5.1: Shared Object Tree Model

Phase 1: Tree row model

- Generate rows from committed drawing state.
- Include ID, kind, label/name, visible, locked, selected, editable, z-order,
  pane ID, and group membership.

Phase 2: Shared actions

- Select single row, additive row select, range select if supported, delete,
  duplicate, hide/show, lock/unlock, bring forward/back/front/back.

Phase 3: Naming model

- Add optional user-facing names without breaking persistence.
- Fall back to localized drawing kind labels.

### Epic 5.2: Web Object Tree Panel

Phase 1: Minimal panel surface

- Add a web object tree panel/surface that can be opened by app UI or widget API.
- Keep the initial UI compact and utilitarian.

Phase 2: Row actions

- Wire selection, visibility, lock, delete, duplicate, and z-order through
  shared commands.

Phase 3: Multi-select

- Support additive selection and bulk actions through existing grouped
  selection state.

### Epic 5.3: Mobile Object Tree Surface

Phase 1: Mobile panel/sheet

- Add a mobile object tree sheet using the same shared row model.

Phase 2: Row actions

- Wire mobile row actions to the same shared commands.

Phase 3: Multi-select

- Support mobile-friendly multi-select and bulk actions.

### Epic 5.4: Layering Validation

Phase 1: Shared z-order tests

- Verify object tree actions preserve drawing IDs and selection.

Phase 2: Web render-order tests

- Verify canvas drawing order follows object tree z-order.

Phase 3: Mobile render-order tests

- Verify Skia primitive order follows object tree z-order.

## Gap 6: Text and Property Edit Lifecycle

Goal: make double-click/double-tap and properties editing consistent across
drawing kinds.

### Epic 6.1: Shared Edit Intent Model

Phase 1: Edit target resolution

- Resolve whether double interaction edits text, opens properties, edits a
  point, or falls back to chart pane behavior.

Phase 2: Text edit state contract

- Preserve existing text edit reducers but route begin/update/commit/cancel
  through commands and history.

Phase 3: Properties intent

- Add a generic selected-drawing properties intent, even if the first UI only
  exposes existing style controls.

### Epic 6.2: Web Double-Click Editing

Phase 1: Text edit parity

- Ensure double-click on all text-capable drawings opens the text editor at the
  correct screen bounds.

Phase 2: Properties popover

- Open a selected drawing properties popover for non-text drawings when
  appropriate.

Phase 3: History and focus

- Commit text/property changes as one undoable transaction.

### Epic 6.3: Mobile Double-Tap Editing

Phase 1: Text edit parity

- Ensure double-tap on all text-capable Skia drawings opens the native editor at
  the correct position.

Phase 2: Properties sheet

- Open a mobile properties sheet for non-text drawings when appropriate.

Phase 3: History and focus

- Commit mobile text/property changes as one undoable transaction.

## Gap 7: Keyboard and Modifier Behavior

Goal: add TradingView-style keyboard and modifier affordances after commands and
gesture placement exist.

### Epic 7.1: Shared Keyboard Action Map

Phase 1: Action registry

- Define drawing keyboard actions for delete, cancel, undo, redo, duplicate,
  copy/paste if supported later, nudge, and select all.

Phase 2: Focus rules

- Document and implement when drawing shortcuts are active versus when text
  inputs, chart panes, or app controls own keyboard input.

Phase 3: Command dispatch

- Route keyboard actions through shared commands and history.

### Epic 7.2: Web Keyboard Integration

Phase 1: Core shortcuts

- Implement Delete/Backspace, Escape, Ctrl/Cmd+Z, redo, and duplicate.

Phase 2: Modifier drag

- Implement Shift+drag duplicate for selected drawings.
- Preserve Shift constraints for active drawing placement.

Phase 3: Nudge

- Add arrow-key nudge for selected drawings if it can be implemented as an
  undoable command without conflicting with chart navigation.

### Epic 7.3: Mobile Modifier Equivalents

Phase 1: Hardware keyboard support

- Support undo/redo/delete where React Native keyboard events are available.

Phase 2: Touch-native duplicate workflow

- Provide a mobile sibling for Shift+drag duplicate through action surface
  duplicate-then-drag or equivalent native gesture if feasible.

Phase 3: Constraint affordance

- Provide mobile constraint toggles for square/angle-constrained drawing where
  web uses Shift.

## Gap 8: Public API, Events, Persistence, and Testing

Goal: make the drawing system app-integratable and regression-resistant.

### Epic 8.1: Public Drawing API Completion

Phase 1: Command-backed APIs

- Ensure create, update, select, delete, duplicate, reorder, lock, hide,
  style update, undo, redo, open object tree, and open properties APIs exist
  for web and mobile.

Phase 2: Event subscriptions

- Add drawing command/drawing event notifications for create, update, delete,
  select, reorder, and edit commit.

Phase 3: Error behavior

- Define return values for stale IDs, locked drawings, hidden drawings, invalid
  point counts, and unavailable platform UI surfaces.

### Epic 8.2: Persistence and Migration Hardening

Phase 1: New state fields

- Persist committed drawing data and user-facing names.
- Do not persist transient draft, toolbar, context menu, object tree open state,
  text edit draft, or undo/redo stacks unless explicitly decided later.

Phase 2: Restore validation

- Clear invalid selection/edit state on restore.
- Normalize old drawings without new fields.

Phase 3: Cross-platform import/export

- Ensure web layouts and mobile drawing import/export use the same schema.

### Epic 8.3: Test Harness and Manual Evidence

Phase 1: Shared command tests

- Cover every command and command history boundary.

Phase 2: Web interaction tests

- Cover mouse placement, selection toolbar, context menu, object tree actions,
  keyboard shortcuts, and double-click edit.

Phase 3: Mobile interaction/model tests

- Cover touch placement, Skia render output, mobile action surfaces, object tree
  actions, and mobile handle APIs.

Phase 4: Visual parity checklist

- Maintain a manual screenshot checklist for selected state, draft state,
  toolbar/context surfaces, object tree, and text/property editing on desktop
  and mobile viewport sizes.

## First Implementation Recommendation

Start with Gap 1 and Gap 2. Do not implement drag-to-draw until the command and
history layer can record it as one transaction. The first implementation PR
should be narrow:

1. Add the capability matrix and PR checklist.
2. Add the shared command envelope around existing drawing actions.
3. Add undo/redo for existing drawing mutations only.
4. Wire undo/redo on both web and mobile APIs.

After that, implement drag-to-draw as the first gesture epic using rectangle,
trend line, and ellipse as proof tools.
