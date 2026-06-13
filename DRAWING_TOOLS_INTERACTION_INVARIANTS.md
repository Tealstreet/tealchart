# Drawing Tools Interaction Invariants

This document defines the drawing interaction rules that every web Canvas and
mobile Skia feature must follow. It is the contract for the command, history,
gesture, toolbar, context menu, object tree, and edit-surface work tracked in
`DRAWING_TOOLS_DIMENSIONAL_GAP_PLAN.md`.

## Scope

These invariants cover user markup state and interactions only. They do not
replace chart data layout, pane layout, price/time scale layout, or indicator
rendering rules. They do define how drawing UI surfaces may read and mutate
drawing state.

Every user-facing behavior must land with both:

- Web Canvas/DOM behavior through `TealchartWidget`, `ChartCore`,
  `EventManager`, and drawing overlay surfaces.
- Mobile React Native/Skia behavior through `SkiaTealchart`, mobile input
  utilities, the render model, and native overlay surfaces.

If a feature cannot satisfy both paths in one PR, reduce the scope before
shipping.

## Terms

| Term | Meaning |
| --- | --- |
| Drawing state | The full user drawing state: active tool, committed drawings, selection, draft, edit drag, text edit, and future history metadata. |
| Committed drawing | A persisted drawing entry with a stable ID and anchors/payload. |
| Draft | A transient in-progress drawing placement or drag capture that is not persisted to layout. |
| Preview | Render output derived from a draft or active edit before commit. |
| Selection | The active selected drawing IDs. The first ID is the primary selection for backward-compatible APIs. |
| Text edit | A transient platform editor session for a text-capable drawing. It is never serialized to layout. |
| Command | A named drawing mutation request such as create, delete, duplicate, style, move, edit handle, or z-order. |
| Transaction | One undoable user intent. A drag gesture may emit many updates but commits as one transaction. |
| Platform adapter | Web or mobile code that converts pointer, touch, keyboard, toolbar, or menu input into shared drawing intents. |
| UI surface | Toolbar, floating toolbar, context menu, object tree, text editor, or app-owned integration. |

## State Ownership

Shared drawing reducers and future command reducers are the authority for state
transitions. Platform code may collect coordinates, resolve panes, measure text,
or position UI, but it must not directly mutate drawing arrays or transient
state in a platform-only way.

Web ownership:

- `TealchartWidget` owns the live drawing state for the web chart.
- `ChartCore` and `EventManager` route chart input into drawing intents when a
  drawing interaction owns the event.
- DOM overlay surfaces dispatch drawing APIs or commands back to
  `TealchartWidget`.
- Canvas renderers consume committed, draft, selected, and edit-preview render
  entries; they do not mutate drawing state.

Mobile ownership:

- `SkiaTealchart` owns the live drawing state for the mobile chart.
- Mobile input utilities translate touch and gesture events into shared drawing
  intents.
- React Native overlay surfaces and imperative handles dispatch drawing APIs or
  commands back to `SkiaTealchart`.
- Skia render-model utilities consume drawing state and produce render entries;
  they do not mutate drawing state.

Shared ownership:

- Command dispatch will sit in the shared drawing layer and wrap existing
  reducers before higher-level surfaces depend on it.
- Existing public APIs remain stable by dispatching equivalent shared commands.
- UI surfaces can request mutations only through shared commands or public APIs
  that are implemented by those commands.
- Layout persistence stores committed drawings only. Active tool, selection,
  draft, edit drag, text edit, hover, preview, and future history stacks are
  transient.

## Command Sources

Every drawing mutation should be attributable to one source:

| Source | Examples |
| --- | --- |
| `pointer` | Web mouse, pen, or touch pointer events. |
| `touch` | Mobile tap, drag, long-press, pinch-compatible drawing input. |
| `keyboard` | Delete, Escape, Ctrl/Cmd+Z, redo, modifier-assisted actions. |
| `api` | Widget methods, Skia imperative handles, app toolbar callbacks. |
| `toolbar` | Top bar, drawing sidebar, selected-object floating toolbar. |
| `contextMenu` | Right-click or long-press selected-object menu. |
| `objectTree` | Object tree selection, reorder, visibility, lock, delete. |
| `textEditor` | Text commit, cancel, and style edits from text editing UI. |

Command metadata should include the source, affected IDs, timestamp, and a
transaction grouping key when several low-level events represent one user
intent.

## Mutation Rules

| Mutation | Required behavior |
| --- | --- |
| Select | Hit testing selects the topmost visible, unlocked drawing. Misses clear selection unless additive selection is active. |
| Multi-select | Additive input toggles visible, unlocked drawings and preserves a stable ordered ID list. |
| Create | Generated drawings receive stable IDs and commit only when the placement mode has enough anchors or payload. |
| Draft begin | Starting a non-select drawing clears selection and text edit. |
| Draft update | Preview updates are transient and never create a committed drawing by themselves. |
| Draft commit | Commit creates exactly one drawing or a documented multi-drawing payload, selects the created drawing, and clears draft/text edit. |
| Draft cancel | Cancel clears draft/preview without changing committed drawings. |
| Delete | Deletes selected or targeted unlocked drawings and clears affected selection/edit state. |
| Duplicate | Clones selected or targeted unlocked drawings with new IDs and deep-copied nested payloads. |
| Move | Whole-drawing movement preserves IDs and moves all selected unlocked drawings together. |
| Handle edit | Handle or point-index edits are single-drawing operations unless a future grouped-edit mode explicitly defines otherwise. |
| Style | Style updates preserve IDs and apply to selected or targeted unlocked drawings. |
| Visibility | Hiding selected drawings clears those drawings from selection and edit state. |
| Lock | Locking selected drawings clears those drawings from selection and edit state. |
| Z-order | Reorder operations preserve IDs, group membership, and relative order inside the affected group where applicable. |
| Text edit begin | Beginning text edit selects the target, switches active tool to select, clears draft, and records transient editor state. |
| Text edit commit | Commit writes text through shared reducers, clears text edit, and becomes one history transaction. |
| Text edit cancel | Cancel clears transient editor state without changing committed drawing text. |

Locked drawings are not selectable, editable, duplicated, deleted, styled, or
reordered by ordinary user actions. Any maintenance API that intentionally
includes locked drawings must name that behavior explicitly and behave the same
on web and mobile.

Hidden drawings are not hittable or selectable. They remain in committed state
and layout persistence until deleted.

Stale IDs are no-ops. A no-op command should leave state referentially
unchanged where practical so platform owners can avoid unnecessary rendering.

## Gesture Rules

Drawing gestures must be deterministic and mode-specific. A shape tool may not
fabricate arbitrary dimensions from a single click unless that tool is defined
as one-point anchored markup.

Placement modes:

- One-point tools commit from a single anchor.
- Two-point tools support drag-to-place and may support click-click placement
  when that behavior is deliberately specified.
- Multi-point tools collect the documented number of anchors before commit.
- Path/freehand tools capture drag samples and commit only when enough distinct
  points exist.
- Computed tools may capture anchors and derive additional geometry from chart
  data, but the captured anchors remain stable.

Thresholds:

- Pointer and touch movement below the drag threshold must not create a random
  sized shape.
- A too-short path or zero-size shape cancels or remains in draft according to
  the tool placement mode.
- Pane changes during draft placement start a new draft or cancel the current
  draft using the same rule on web and mobile.

Modifier and platform equivalents:

- Shift-constrained placement and Shift-drag duplicate are web keyboard
  behaviors. Mobile must expose equivalent app/API or gesture behavior before
  the feature ships.
- Ctrl/Cmd+Z undo and redo are web keyboard behaviors. Mobile must expose
  equivalent imperative handle or toolbar command behavior in the same PR.

## Cancellation Rules

| Trigger | Required behavior |
| --- | --- |
| Escape or cancel API | Clear active draft, edit drag, and text edit; committed drawings remain unchanged. |
| Active tool change | Clear draft and text edit before switching tools. |
| Select-mode click miss | Clear selection unless additive selection is active. |
| Non-select tool input | Clear selection and text edit before starting the new draft. |
| Text editor blur/cancel | Use explicit commit or cancel semantics. Do not infer platform-specific behavior differently. |
| Interrupted gesture | End or cancel the current transaction exactly once. |
| Layout restore | Replace committed drawings and clear transient drawing state. |

## History Rules

The command/history layer must treat one user intent as one undoable
transaction:

- Create, delete, duplicate, z-order, visibility, lock, and style actions are
  single transactions.
- Drag placement, whole-drawing move, handle edit, and path drawing are single
  transactions from gesture begin to gesture commit/cancel.
- Text edit is a single transaction on commit.
- Selection-only changes may be tracked separately from committed drawing
  history unless a future feature requires undoing selection.
- Hover, preview, draft update, and toolbar positioning are never history
  entries.

Undo and redo must restore the same committed drawing state on web and mobile.
If transient state is invalid after restoration, clear it rather than trying to
rebind stale IDs.

## Surface Rules

Drawing surfaces are clients of the same command model:

- Top bar and drawing sidebar choose tools and may expose global commands.
- Selected-object floating toolbar exposes actions for the current selection.
- Context menu exposes the same selected-object actions plus ordering actions.
- Object tree exposes selection, reorder, visibility, lock, rename/text where
  applicable, duplicate, and delete.
- Double-click or double-tap opens text/property editing only when the target
  supports that editing mode.

Selected-object actions must not live only in the chart top bar once a
drawing-native surface exists. During migration, duplicated controls are allowed
only when both web and mobile paths use the same command semantics.

## Parity Checklist

Before any drawing PR is ready:

- The behavior has shared reducer, command, render-model, or test coverage where
  applicable.
- Web Canvas/DOM and mobile Skia/RN implementations are both present or the PR
  is documentation-only.
- Public web APIs and mobile imperative handles expose equivalent concepts when
  app integration is part of the feature.
- Focused tests cover shared logic and every touched adapter, or the PR states
  the explicit test gap.
- PR notes call out web coverage, mobile coverage, and any intentional deferred
  parity gaps.
