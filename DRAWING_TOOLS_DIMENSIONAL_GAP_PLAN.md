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
- Status: shared drawing command history ships with bounded undo/redo stacks,
  before/after snapshots, transient-state exclusion, and command-event
  metadata for web Canvas and mobile Skia callers.

Phase 2: Transaction boundaries

- Group drag gestures into one history entry.
- Group text edit commit into one entry.
- Group multi-select actions like delete/duplicate/z-order into one entry.
- Status: placement, duplicate/edit drag, text edit commit, style,
  lock/visibility, delete/duplicate, and z-order commands record coherent
  transaction entries with redo clearing.

Phase 3: Web keyboard/API integration

- Add `Ctrl/Cmd+Z` undo and redo shortcuts on web when chart focus owns drawing
  keyboard input.
- Expose widget APIs for undo/redo drawing commands.
- Status: web widget APIs and keyboard shortcuts route undo/redo through the
  shared drawing history while preserving chart focus/input ownership rules.

Phase 4: Mobile handle/API integration

- Add matching imperative handle methods for mobile Skia.
- Add mobile-safe command dispatch so app toolbars can trigger undo/redo.
- Status: mobile Skia handle and keyboard adapters route undo/redo through the
  same shared drawing history and expose matching app-toolbar dispatch paths.

### Epic 2.3: History Validation

Status: in progress. Shared history tests cover creation, duplicate/edit drag,
text edits, style changes, lock/visibility, z-order, redo clearing, and
coalescing. Web widget and mobile Skia command adapter tests now also validate
tap/click-created drawings and selected action mutations: draft inputs stay out
of history, final placement records one undoable transaction, action commands
record undoable transactions, and redo restores the committed state.

Phase 1: Shared tests

- Test undo/redo for create, delete, duplicate, z-order, style, lock/visibility,
  move, handle edit, and text edit commit.

Phase 2: Web adapter tests

- Test keyboard dispatch and focus rules.
- Confirm existing chart shortcuts and pane interactions are not hijacked.
- Status: web widget tests cover keyboard delete, undo/redo, copy/paste,
  duplicate, and select-all ownership.

Phase 3: Mobile adapter tests

- Test imperative handle undo/redo.
- Confirm Skia render model reflects restored drawing state.
- Status: mobile command adapter tests cover undo/redo, copy/paste,
  duplicate, select-all, nudge, and draft cancellation through the shared
  keyboard/history path.

## Gap 3: Real Drawing Gesture Placement

Goal: replace click-only placement for shape tools with real drawing gestures
while preserving click-to-place workflows where appropriate.

Status: initial slice in progress. Shared placement modes and two-anchor drag
placement commands exist for line, shape, measurement, forecasting, Fibonacci,
Gann, cyclic, callout/price-note, image, and fixed-range volume profile tools;
drag-seeded placement exists for multi-anchor geometric, channel, pitchfork,
Fibonacci, forecasting, position, bars-pattern, Elliott, and harmonic-pattern
tools. Web Canvas and mobile Skia route those tools through matching drag
preview/commit flows. Event-level web regression coverage now guards click
preservation, mousemove promotion, and mouseup promotion through the
pending-drawing path;
mobile command/gesture/render-model regression gates cover the sibling behavior.
Placement constraints are wired through shared screen-space geometry: web uses
Shift during drag, while mobile Skia exposes `constrainUserDrawingPlacement` for
touch toolbars to request matching square and 45-degree snapping. Remaining Gap
3 work should expand tool coverage and deeper cancel/pointer-exit harness
coverage.

### Epic 3.1: Shared Placement State Machine

Phase 1: Placement mode registry

- Add a shared mapping from tool to placement mode and required anchors.
- Keep this separate from render geometry so behavior can evolve without adding
  shape-specific input branches everywhere.
- Status: shared two-anchor drag placement now covers the initial line/shape
  proof tools plus `trendAngle`, `priceRange`, `dateRange`, `datePriceRange`,
  `forecast`, `fixedRangeVolumeProfile`, `callout`, `priceNote`, and `image`,
  with the same registry consumed by web Canvas and mobile Skia adapters.
- Status: shared two-anchor drag placement now also covers mature Fib/Gann and
  cycle tools with existing web/mobile render coverage: `fibRetracement`,
  `fibExtension`, `fibFan`, `fibSpeedResistanceFan`, `fibArcs`,
  `fibSpeedResistanceArcs`, `fibCircles`, `fibSpiral`, `gannFan`, `gannBox`,
  `gannSquare`, `gannSquareFixed`, `fibTimeZone`, `cyclicLines`,
  `timeCycles`, and `sineLine`.
- Status: shared placement drag now seeds the first two anchors for geometric
  three-anchor tools, with web Canvas and mobile Skia continuing through the
  normal final click/tap commit path: `triangle`, `curve`, `arc`, `polyline`,
  and `rotatedRectangle`.
- Status: shared placement drag now also seeds the first two anchors for
  channel and pitchfork three-anchor tools, with web Canvas and mobile Skia
  continuing through the normal final click/tap commit path: `parallelChannel`,
  `regressionTrend`, `flatTopBottom`, `pitchfork`, `schiffPitchfork`,
  `modifiedSchiffPitchfork`, `insidePitchfork`, and `pitchfan`.
- Status: shared placement drag now also seeds the first two anchors for
  Gann/Fibonacci three-anchor tools, with web Canvas and mobile Skia continuing
  through the normal final click/tap commit path: `trendBasedFibExtension`,
  `fibWedge`, `fibChannel`, and `trendBasedFibTime`.
- Status: shared placement drag now also seeds the first two anchors for
  supported four-anchor tools, with web Canvas and mobile Skia continuing
  through the normal remaining click/tap commit path: `doubleCurve` and
  `disjointChannel`.
- Status: shared placement drag now also seeds the first two anchors for
  supported three-anchor forecasting, measurement, and pattern tools, with web
  Canvas and mobile Skia continuing through the normal final click/tap commit
  path: `projection`, `sector`, `longPosition`, `shortPosition`,
  `barsPattern`, `elliottCorrectiveWave`, and `elliottDoubleComboWave`.
  `barsPattern` remains a computed-special tool, but its drag-start draft now
  preserves source bars so web Canvas and mobile Skia can render active previews
  and commit the final source-bar payload.
- Status: shared placement drag now also seeds the first two anchors for
  supported four- and five-anchor pattern tools, with web Canvas and mobile
  Skia continuing through the normal remaining click/tap commit path:
  `trianglePattern`, `abcdPattern`, `xabcdPattern`, `cypherPattern`,
  `threeDrivesPattern`, `headShouldersPattern`, `elliottImpulseWave`,
  `elliottTripleComboWave`, and `elliottTriangleWave`.

Phase 2: Draft lifecycle

- Add shared begin/update/commit/cancel placement operations.
- Support preview anchor updates without committing.
- Prevent accidental zero-size or default-size drawings.
- Status: active web drawing drags now cancel through an explicit drawing-drag
  cancel callback on Escape and touchcancel, clearing draft previews and the
  draft through the same owner command path. Mobile Skia command coverage
  verifies host-triggered placement cancellation stays out of undo history, and
  native failed/cancelled pan finalization now routes drawing drags to cancel
  instead of commit.

Phase 3: Gesture thresholds and constraints

- Define pointer/touch drag thresholds.
- Status: initial constraints shipped for drag two-anchor rectangle, circle,
  ellipse, and line-family tools through a shared helper, with web Shift and a
  mobile Skia prop for toolbar-controlled constrained placement.
- Future work: broaden constrained placement semantics as multi-anchor tools
  move from click placement to dedicated gestures.

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

Status: initial selected-action surface descriptors shipped for properties,
text edit, quick stroke/fill/text appearance style, duplicate, delete,
z-order, visibility, and lock/unlock.
The web floating toolbar, web context menu, mobile Skia action strip, and
mobile long-press menu consume this shared model. Shared selection bounds and
preferred action anchor geometry now resolve from the drawing render model for
both Canvas and Skia callers. Rich text/tool-specific inline controls remain
open.

Phase 1: Action availability model

- Status: properties, quick line color/width/style/visibility/opacity changes,
  quick fill color and fill visibility changes, quick text
  color/font-size/family/weight/style changes plus rich-text
  underline/strike-through/wrap, wrapped text-width, and text-alignment
  controls, quick trend-line extension and icon library controls,
  duplicate, delete, lock, hide/show, unlock, and z-order action descriptors
  resolve from shared drawing state.
- Status: text-capable drawings now expose a shared selected/context action for
  starting text edit on both web Canvas and mobile Skia.
- Future work: add richer typography, geometry, and tool-specific actions to
  the same model as those surfaces move out of the top bar.

Phase 2: Anchor geometry model

- Status: selected drawing bounds, preferred toolbar anchor point, single-anchor
  minimum target sizing, multi-select bounds, and pane split metadata resolve
  from shared render geometry.
- Status: web floating toolbar and mobile Skia action strip now use the same
  safe viewport clamp helper so action surfaces stay inside left/right,
  top-bar, and bottom insets near chart edges.

Phase 3: Command dispatch

- Ensure every toolbar/context action dispatches the command layer from Gap 2.

### Epic 4.2: Web Floating Toolbar

Status: initial selected-object floating toolbar shipped for properties, text
edit, quick stroke/fill/text appearance style, text alignment, trend-line
extension, icon library, duplicate, delete, z-order, visibility, and lock/unlock
actions.
The surface is positioned from the shared selection action anchor model and
dispatches existing drawing commands or app-owned properties UI. Rich
text/tool-specific style controls still live in the top bar/properties
surface and should migrate in later slices.

Phase 1: DOM surface primitive

- Status: chart-overlay floating toolbar positions near selected drawing bounds
  without claiming chart layout space.

Phase 2: Initial actions

- Status: properties, text edit for text-capable drawings, quick line
  color/width/style/visibility/opacity changes, quick fill color and fill visibility changes,
  quick text color/font-size/family/weight/style changes plus rich-text
  underline/strike-through/wrap, wrapped text-width, and text-alignment
  controls, quick trend-line extension and icon library controls, duplicate,
  delete, z-order, hide/show, and lock/unlock actions moved out of the top bar
  into the floating toolbar for selected drawings.
- Future work: migrate richer typography/tool-specific style actions after the
  style-control grouping is ready for both web and mobile.

Phase 3: Dismissal and focus

- Dismiss on selection clear, Escape, draft start, or outside click.
- Keep toolbar interactions from causing chart selection misses.
- Status: selected-action surfaces now use a shared visibility guard so web
  floating toolbar actions dismiss during transient draft/text-edit states while
  retaining pointer-event isolation for toolbar clicks.
- Status: web widget coverage now pins the chart-surface selection-miss route
  that clears selection without recording undo history, dismissing selected
  action surfaces through the shared selection/anchor state.
- Status: bare Escape now clears selected drawings when no draft is active,
  dismissing web selected-action surfaces without recording undo history.
- Status: web floating toolbar coverage now pins pointer-event isolation for
  selected-action surfaces, so toolbar clicks cannot fall through into chart
  selection misses.
- Status: selected drawing style controls now use shared popover-group
  metadata, and both the web floating toolbar and mobile Skia action strip
  render the style actions behind the same anchored Style trigger instead of
  exposing every quick style action as flat toolbar chrome.

### Epic 4.3: Mobile Selection Action Sheet

Status: initial anchored mobile action strip shipped for the same selected
object actions as web, including the shared properties-open and text-edit entry
points plus quick stroke/fill/text appearance style and text-alignment
controls plus trend-line extension and icon library controls. It consumes the shared
selected-action descriptors and selection action anchor model in the Skia chart
component.

Phase 1: Native surface primitive

- Status: anchored React Native action strip added above the selected drawing
  bounds using the same shared anchor model as web.

Phase 2: Initial actions

- Status: properties, text edit for text-capable drawings, quick line
  color/width/style/visibility/opacity changes, quick fill color and fill visibility changes,
  quick text color/font-size/family/weight/style changes plus rich-text
  underline/strike-through/wrap, wrapped text-width, and text-alignment
  controls plus quick trend-line extension and icon library controls, duplicate,
  delete, z-order, hide/show, and lock/unlock actions expose the same
  selected-action descriptors as web and dispatch existing mobile drawing
  commands or app-owned properties UI.

Phase 3: Dismissal and focus

- Dismiss on selection clear, gesture start, or app-level dismissal.
- Preserve mobile chart pan/zoom outside the action surface.
- Status: mobile Skia action strip consumes the same shared visibility guard as
  web, so transient draft/text-edit states hide selected actions without
  diverging from Canvas behavior.
- Status: mobile command-adapter coverage now pins touch selection misses
  clearing selection and hiding the shared selected action surface model.
- Status: mobile hardware-keyboard Escape uses the same shared clear-selection
  action as web, hiding the Skia selected action strip without recording undo
  history.
- Status: mobile selected-action dispatch coverage now pins toolbar taps to
  their intended callbacks or drawing commands without emitting direct
  selection commands.
- Status: mobile Skia consumes the same shared popover-group metadata as web
  for selected drawing style controls, with RN coverage for opening the Style
  popover and dispatching a style command through the mobile adapter.

### Epic 4.4: Drawing Context Menu

Status: initial drawing context menu shipped for properties, text edit, quick
stroke/fill/text appearance style, line visibility/opacity, text alignment,
trend-line extension, icon library, duplicate, delete, z-order, visibility, and
lock/unlock actions. Web right-click and mobile Skia long-press consume the
same shared context-action resolver and preserve existing chart context menu
behavior when no drawing is hit.

Phase 1: Shared context action resolution

- Status: pointer/touch hit-testing selects the target drawing when needed and
  flattens the shared selected-action surface into context menu action items.

Phase 2: Web right-click menu

- Status: right-click over a drawing shows drawing actions before falling back
  to the app-provided chart context menu outside drawings.
- Status: DOM context-menu coverage now pins menu pointer/click isolation so
  drawing menu actions cannot fall through to chart selection handlers.

Phase 3: Mobile long-press menu

- Status: long-press over a drawing in Skia select mode opens the native mobile
  context menu with matching drawing actions and command semantics.
- Status: mobile context-menu component coverage now pins menu item taps to the
  intended action/close path without bubbling into chart touch handlers.
- Status: text-capable drawing context actions now begin text editing through
  the same command owner path on both web Canvas and mobile Skia.
- Future work: add richer typography/fill/tool-specific context actions after
  the style popover model moves out of the top bar on both platforms.

## Gap 5: Object Tree and Layer Management

Goal: provide a first-class object tree model for selecting, ordering, locking,
hiding, and managing drawings.

### Epic 5.1: Shared Object Tree Model

Phase 1: Tree row model

- Generate rows from committed drawing state.
- Include ID, kind, label/name, visible, locked, selected, editable, z-order,
  pane ID, and group membership.
- Status: shared row resolver added in `drawings/objectTree.ts`; rows are
  surface-neutral for web Canvas and mobile Skia consumers, default to
  front-to-back order, persist custom-name labels, and include provisional
  group fields until persistence-backed grouping lands.

Phase 2: Shared actions

- Select single row, additive row select, range select if supported, delete,
  duplicate, hide/show, lock/unlock, bring forward/back/front/back.
- Status: shared object-tree actions now resolve to drawing command sequences
  with `objectTree` metadata, including multi-row selection setup before
  mutating selection-scoped commands.

Phase 3: Naming model

- Add optional user-facing names without breaking persistence.
- Fall back to localized drawing kind labels.
- Status: committed drawings support optional names; object-tree rows prefer
  names as labels and layout serialization/deserialization preserves them while
  unnamed drawings continue to use shared drawing-kind labels.

### Epic 5.2: Web Object Tree Panel

Phase 1: Minimal panel surface

- Add a web object tree panel/surface that can be opened by app UI or widget API.
- Keep the initial UI compact and utilitarian.
- Status: app-owned web panel integration is exposed through widget APIs for
  resolving and opening the shared object-tree model, with an
  `onUserDrawingObjectTreeOpen` callback for toolbar/sidebar hosts.
- Status: the selected drawing floating toolbar and drawing right-click context
  menu now include a shared object-tree open action that calls the same
  app-owned object-tree callback.

Phase 2: Row actions

- Wire selection, visibility, lock, delete, duplicate, and z-order through
  shared commands.
- Status: web widget object-tree dispatch routes row actions through the
  shared command resolver and injects chart-owned duplicate IDs so callers do
  not need internal ID factories.

Phase 3: Multi-select

- Support additive selection and bulk actions through existing grouped
  selection state.
- Status: shared range/additive selection commands and multi-row mutation
  actions resolve through existing grouped selection state for web object-tree
  hosts.

### Epic 5.3: Mobile Object Tree Surface

Phase 1: Mobile panel/sheet

- Add a mobile object tree sheet using the same shared row model.
- Status: mobile Skia exposes matching handle methods and an
  `onUserDrawingObjectTreeOpen` prop so app-owned sheets can use the same row
  model as web.
- Status: the mobile selected action strip and drawing long-press context menu
  now include the same shared object-tree open action and resolve the current
  row model for app-owned sheets.

Phase 2: Row actions

- Wire mobile row actions to the same shared commands.
- Status: mobile Skia dispatches object-tree actions through the same shared
  command resolver with mobile-owned duplicate ID generation.

Phase 3: Multi-select

- Status: mobile object-tree dispatch consumes the same shared additive/range
  selection and multi-row mutation commands as web, with mobile-owned duplicate
  ID generation.

- Support mobile-friendly multi-select and bulk actions.

### Epic 5.4: Layering Validation

Phase 1: Shared z-order tests

- Verify object tree actions preserve drawing IDs and selection.
- Status: shared object-tree z-order tests cover command dispatch preserving
  drawing IDs, selection, and front-to-back model order.

Phase 2: Web render-order tests

- Verify canvas drawing order follows object tree z-order.
- Status: web renderer tests assert committed drawing paint order follows
  drawing z-order before selected handles.

Phase 3: Mobile render-order tests

- Verify Skia primitive order follows object tree z-order.
- Status: mobile render-model tests assert committed drawing primitive order
  follows drawing z-order before selected handles.

## Gap 6: Text and Property Edit Lifecycle

Goal: make double-click/double-tap and properties editing consistent across
drawing kinds.

### Epic 6.1: Shared Edit Intent Model

Phase 1: Edit target resolution

- Resolve whether double interaction edits text, opens properties, edits a
  point, or falls back to chart pane behavior.
- Status: shared edit-intent resolver classifies double interaction targets
  as text, properties, point, or pane fallback and is consumed by both web
  widget double-click and mobile Skia double-tap handlers.

Phase 2: Text edit state contract

- Preserve existing text edit reducers but route begin/update/commit/cancel
  through commands and history.
- Status: shared and mobile command-history tests pin begin/update/cancel as
  transient state and committed text edits as one undoable transaction.

Phase 3: Properties intent

- Add a generic selected-drawing properties intent, even if the first UI only
  exposes existing style controls.
- Status: shared selected-drawing properties intent is exported and exposed by
  web widget and mobile Skia callback/handle APIs; visual popover/sheet remains
  in Epics 6.2 and 6.3.

### Epic 6.2: Web Double-Click Editing

Phase 1: Text edit parity

- Ensure double-click on all text-capable drawings opens the text editor at the
  correct screen bounds.
- Status: shared edit-intent coverage now pins every text annotation kind as
  text-edit eligible, with web editor placement coverage for callouts.

Phase 2: Properties popover

- Open a selected drawing properties popover for non-text drawings when
  appropriate.
- Status: initial shared properties surface descriptors now resolve line,
  fill, text, geometry, and icon control groups for web popover consumers.

Phase 3: History and focus

- Commit text/property changes as one undoable transaction.
- Status: properties surface controls now convert through shared drawing
  commands and web widget dispatch so property changes use the command/history
  owner path.

### Epic 6.3: Mobile Double-Tap Editing

Phase 1: Text edit parity

- Ensure double-tap on all text-capable Skia drawings opens the native editor at
  the correct position.
- Status: mobile double-tap coverage now pins every text annotation kind as
  text-edit eligible, with Skia render-model coverage for active callout edits.

Phase 2: Properties sheet

- Open a mobile properties sheet for non-text drawings when appropriate.
- Status: mobile Skia handle parity now exposes the same shared properties
  surface model for native sheet consumers.

Phase 3: History and focus

- Commit mobile text/property changes as one undoable transaction.
- Status: mobile Skia handle parity now dispatches properties surface controls
  through the same shared drawing command conversion path.

## Gap 7: Keyboard and Modifier Behavior

Goal: add TradingView-style keyboard and modifier affordances after commands and
gesture placement exist.

### Epic 7.1: Shared Keyboard Action Map

Phase 1: Action registry

- Define drawing keyboard actions for delete, cancel, undo, redo, duplicate,
  copy/paste if supported later, nudge, and select all.
- Shipped initial shared resolver for undo, redo, selected delete, and draft
  cancel so web and mobile adapters consume the same action map.
- Shipped shared copy/paste keyboard actions backed by transient adapter
  clipboards and undoable paste commands.
- Shipped shared select-all keyboard action for committed user drawings.
- Shipped shared duplicate-selected keyboard action backed by undoable duplicate
  commands.

Phase 2: Focus rules

- Document and implement when drawing shortcuts are active versus when text
  inputs, chart panes, or app controls own keyboard input.

Phase 3: Command dispatch

- Route keyboard actions through shared commands and history.
- Shipped web widget and mobile command utility dispatch paths that preserve
  existing drawing command history semantics.

### Epic 7.2: Web Keyboard Integration

Phase 1: Core shortcuts

- Implement Delete/Backspace, Escape, Ctrl/Cmd+Z, redo, and duplicate.
- Shipped Ctrl/Cmd+C copy selected drawing and Ctrl/Cmd+V paste object on web
  while chart keyboard ownership is active.
- Shipped Ctrl/Cmd+A select all committed drawings on web while chart keyboard
  ownership is active.
- Shipped Ctrl/Cmd+D duplicate selected drawings on web while chart keyboard
  ownership is active.

Phase 2: Modifier drag

- Implement Shift+drag duplicate for selected drawings.
- Preserve Shift constraints for active drawing placement.
- Shipped shared duplicate-edit-drag begin command. Web select mode uses
  Shift+drag to duplicate the hit/selected drawing set and immediately move the
  copy, with widget-level undo coverage, while active drawing placement still
  uses Shift for constraints.

Phase 3: Nudge

- Add arrow-key nudge for selected drawings if it can be implemented as an
  undoable command without conflicting with chart navigation.
- Shipped shared selected-drawing nudge command and web Arrow-key dispatch
  through the drawing command history.

### Epic 7.3: Mobile Modifier Equivalents

Phase 1: Hardware keyboard support

- Support undo/redo/delete where React Native keyboard events are available.
- Shipped Skia imperative handle support for host-level hardware-keyboard
  adapters to dispatch the shared drawing keyboard actions.
- Shipped mobile command utility and Skia handle support for hardware-keyboard
  copy/paste using the same shared clipboard payload and paste command.
- Shipped mobile command utility and Skia handle support for selected-drawing
  Arrow-key nudge using the same shared coordinate-space command.
- Shipped mobile command utility and Skia handle support for hardware-keyboard
  select all using the shared selection command.
- Shipped mobile command utility and Skia handle support for hardware-keyboard
  duplicate selected using the shared duplicate command.

Phase 2: Touch-native duplicate workflow

- Provide a mobile sibling for Shift+drag duplicate through action surface
  duplicate-then-drag or equivalent native gesture if feasible.
- Shipped Skia imperative `beginDuplicateUserDrawingDragAtPoint` support backed
  by the same shared duplicate-edit-drag command, so mobile action surfaces can
  duplicate at a press point and continue through the existing touch drag path.
- Shipped Skia `duplicateUserDrawingOnEditDrag` prop and imperative override
  mode so host toolbars can make normal touch edit drags duplicate and move the
  copy without needing to compute a drag start point themselves; the imperative
  override is persistent until cleared, matching the placement constraint
  override contract.

Phase 3: Constraint affordance

- Provide mobile constraint toggles for square/angle-constrained drawing where
  web uses Shift.
- Shipped mobile Skia prop and imperative handle override support for
  host-controlled constrained placement, feeding the same shared square and
  45-degree placement geometry as web Shift drag.

## Gap 8: Public API, Events, Persistence, and Testing

Goal: make the drawing system app-integratable and regression-resistant.

### Epic 8.1: Public Drawing API Completion

Phase 1: Command-backed APIs

- Ensure create, update, select, delete, duplicate, reorder, lock, hide,
  style update, undo, redo, open object tree, and open properties APIs exist
  for web and mobile.
- Status: direct complete-drawing create now goes through the shared undoable
  `add` command. Web exposes `TealchartWidget.addUserDrawing`; mobile exposes
  the sibling `SkiaTealchartHandle.addUserDrawing`. Duplicate IDs are a no-op,
  added drawings select by default, and both platforms share the same
  command/history behavior.

Phase 2: Event subscriptions

- Add drawing command/drawing event notifications for create, update, delete,
  select, reorder, and edit commit.
- Status: web exposes changed drawing commands through
  `onUserDrawingCommand` and `widget.subscribe('user_drawing_command', ...)`;
  mobile Skia exposes the same event shape through `onUserDrawingCommand` and
  the mobile command utility covers the sibling command-event behavior. Direct
  state replacement/import remains silent.

Phase 3: Error behavior

- Define return values for stale IDs, locked drawings, hidden drawings, invalid
  point counts, and unavailable platform UI surfaces.
- Status: web widget APIs and mobile command utilities now have focused contract
  coverage for stale IDs, locked drawing opt-in, hidden-selection cleanup,
  and invalid placement drags. Web query/open APIs additionally cover `null` or
  computed-model returns without requiring app callbacks. Mutating commands
  return `false`/unchanged state on unavailable targets.

### Epic 8.2: Persistence and Migration Hardening

Phase 1: New state fields

- Persist committed drawing data and user-facing names.
- Do not persist transient draft, toolbar, context menu, object tree open state,
  text edit draft, or undo/redo stacks unless explicitly decided later.
- Status: shared layout export now stamps the explicit drawing layout schema
  version, preserves committed user-facing names, and continues to omit
  transient selection/draft/text-edit state.

Phase 2: Restore validation

- Clear invalid selection/edit state on restore.
- Normalize old drawings without new fields.
- Status: restore now treats versionless payloads as legacy v1, defaults missing
  legacy `visible`/`locked`/timestamp fields, trims restored names, and ignores
  payloads from newer unsupported schema versions.

Phase 3: Cross-platform import/export

- Ensure web layouts and mobile drawing import/export use the same schema.
- Status: web layout serialization and mobile Skia import/export wrappers share
  the same schema version and migration tests; mobile import accepts raw
  persisted layout payloads through the same unknown-safe deserializer.

### Epic 8.3: Test Harness and Manual Evidence

Phase 1: Shared command tests

- Cover every command and command history boundary.
- Status: shared command tests now include a compile-checked command-union
  coverage guard and duplicate checks for the command type list. Shared reducer
  tests and mobile command adapter tests both cover the previously missing
  user-facing name command route.

Phase 2: Web interaction tests

- Cover mouse placement, selection toolbar, context menu, object tree actions,
  keyboard shortcuts, and double-click edit.
- Status: web EventManager tests now cover drawing-input first refusal for
  mouse double-click and touch double-tap edit routing, including the touch
  `allowPaneDoubleClick` release path. This pairs with the mobile double-tap
  edit-intent tests that resolve selection, properties, text edit, and pane
  fallback behavior through the same shared intent commands.

Phase 3: Mobile interaction/model tests

- Cover touch placement, Skia render output, mobile action surfaces, object tree
  actions, and mobile handle APIs.
- Status: mobile command-history tests cover object-tree hide, duplicate, and
  z-order actions through the shared dispatch resolver. Existing mobile render
  model tests cover selected/draft Skia primitives and action-surface geometry.

Phase 4: Visual parity checklist

- Maintain a manual screenshot checklist for selected state, draft state,
  toolbar/context surfaces, object tree, and text/property editing on desktop
  and mobile viewport sizes.
- Status: `DRAWING_TOOLS_VISUAL_EVIDENCE.md` defines required desktop/mobile
  viewport families, drawing states, regression checks, and a PR evidence
  template for manual visual parity capture.

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
