export type UserDrawingVisualEvidenceViewportId =
  | 'desktop'
  | 'narrowDesktop'
  | 'mobilePortrait'
  | 'mobileLandscape';

export type UserDrawingVisualEvidenceStateId =
  | 'emptyChartDrawingRail'
  | 'activeToolDraft'
  | 'selectedDrawing'
  | 'floatingActionToolbar'
  | 'contextMenuLongPress'
  | 'objectTree'
  | 'textPropertyEditing'
  | 'paneSplitIndicators';

export type UserDrawingVisualEvidenceStateStatus = 'ready' | 'app-owned' | 'known-gap';

export interface UserDrawingVisualEvidenceViewport {
  id: UserDrawingVisualEvidenceViewportId;
  label: string;
  width: number;
  height: number;
  target: 'web' | 'mobile';
  notes: string;
}

export interface UserDrawingVisualEvidenceState {
  id: UserDrawingVisualEvidenceStateId;
  label: string;
  webEvidence: string;
  mobileEvidence: string;
  status?: {
    web: UserDrawingVisualEvidenceStateStatus;
    mobile: UserDrawingVisualEvidenceStateStatus;
    notes: string;
  };
  expectedChecks: readonly string[];
}

export interface UserDrawingVisualEvidenceMatrix {
  viewports: readonly UserDrawingVisualEvidenceViewport[];
  states: readonly UserDrawingVisualEvidenceState[];
  regressionChecks: readonly string[];
}

export const USER_DRAWING_VISUAL_EVIDENCE_MATRIX: UserDrawingVisualEvidenceMatrix = {
  viewports: [
    {
      id: 'desktop',
      label: 'Desktop',
      width: 1280,
      height: 900,
      target: 'web',
      notes: 'Include top bar, left drawing rail, legend, price axis, and time axis when visible.',
    },
    {
      id: 'narrowDesktop',
      label: 'Narrow desktop',
      width: 900,
      height: 700,
      target: 'web',
      notes: 'Verify overlays do not occlude the legend or chart chrome.',
    },
    {
      id: 'mobilePortrait',
      label: 'Mobile portrait',
      width: 390,
      height: 844,
      target: 'mobile',
      notes: 'Verify Skia drawing surfaces, top bar, and touch affordances fit.',
    },
    {
      id: 'mobileLandscape',
      label: 'Mobile landscape',
      width: 844,
      height: 390,
      target: 'mobile',
      notes: 'Verify selected actions and context surfaces remain reachable.',
    },
  ],
  states: [
    {
      id: 'emptyChartDrawingRail',
      label: 'Empty chart with drawing rail',
      webEvidence: 'Canvas plus overlay chrome.',
      mobileEvidence: 'Skia chart plus mobile toolbar/action entry points.',
      status: {
        web: 'ready',
        mobile: 'ready',
        notes: 'Both platforms have first-party chart surfaces for manual layout evidence.',
      },
      expectedChecks: [
        'Chart remains max-size.',
        'Overlays do not hide legend, axes, or candles unexpectedly.',
      ],
    },
    {
      id: 'activeToolDraft',
      label: 'Active tool draft',
      webEvidence: 'Draft preview for a two-anchor and one-anchor tool.',
      mobileEvidence: 'Matching Skia draft primitive.',
      status: {
        web: 'ready',
        mobile: 'ready',
        notes: 'Both platforms render active draft primitives from the shared drawing state.',
      },
      expectedChecks: [
        'Draft style, opacity, handles, and cancellation state match platform expectations.',
      ],
    },
    {
      id: 'selectedDrawing',
      label: 'Selected drawing',
      webEvidence: 'Selected outline, handles, and action anchor.',
      mobileEvidence: 'Matching Skia selected primitives and touch target geometry.',
      status: {
        web: 'ready',
        mobile: 'ready',
        notes: 'Both platforms render selected primitives and action anchors.',
      },
      expectedChecks: [
        'Handles are visible, stable, clipped to pane, and do not shift layout.',
      ],
    },
    {
      id: 'floatingActionToolbar',
      label: 'Floating/action toolbar',
      webEvidence: 'Selected-object actions near selection.',
      mobileEvidence: 'Mobile selected action surface or sibling controls.',
      status: {
        web: 'ready',
        mobile: 'ready',
        notes: 'Web floating toolbar and mobile selected action surface share selected-action descriptors.',
      },
      expectedChecks: [
        'Delete, duplicate, z-order, style, lock, and hide actions map to the same command semantics.',
      ],
    },
    {
      id: 'contextMenuLongPress',
      label: 'Context menu/long press',
      webEvidence: 'Drawing-specific context actions.',
      mobileEvidence: 'Mobile context menu/long-press equivalent.',
      status: {
        web: 'ready',
        mobile: 'ready',
        notes: 'Web context menu and mobile long-press menu consume shared context actions.',
      },
      expectedChecks: [
        'Ordering, visibility, lock, duplicate, delete, and properties actions remain reachable.',
      ],
    },
    {
      id: 'objectTree',
      label: 'Object tree',
      webEvidence: 'Row order, selected rows, lock/visibility/name state.',
      mobileEvidence: 'Mobile object tree/sheet or app-owned surface using the shared row model.',
      status: {
        web: 'app-owned',
        mobile: 'app-owned',
        notes: 'Both platforms expose app-owned object-tree open/dispatch APIs backed by the shared row model.',
      },
      expectedChecks: [
        'Row order matches z-order.',
        'IDs remain stable.',
        'Hidden and locked state is clear.',
      ],
    },
    {
      id: 'textPropertyEditing',
      label: 'Text/property editing',
      webEvidence: 'Double-click edit and property surface.',
      mobileEvidence: 'Double-tap edit and property surface.',
      status: {
        web: 'app-owned',
        mobile: 'app-owned',
        notes: 'Both platforms expose text edit and properties intents; host apps own the final properties surface.',
      },
      expectedChecks: [
        'Text edits commit or cancel as one transaction.',
        'Selection and history state are preserved.',
      ],
    },
    {
      id: 'paneSplitIndicators',
      label: 'Pane split indicators',
      webEvidence: 'Drawings over main pane plus non-overlay indicator panes.',
      mobileEvidence: 'Skia panes with drawing primitives routed to the correct pane.',
      status: {
        web: 'ready',
        mobile: 'ready',
        notes: 'Both platforms route drawing primitives through pane-aware render models.',
      },
      expectedChecks: [
        'Drawings clip to their pane.',
        'Drawings do not overlap dedicated indicator canvases unexpectedly.',
      ],
    },
  ],
  regressionChecks: [
    'Selected and draft drawings render with consistent colors, opacity, dash style, fill, labels, and handles across web and mobile.',
    'Moving, duplicating, hiding, locking, deleting, and reordering a drawing does not change its ID unless the action creates a new drawing.',
    'Drawing overlays do not block normal chart gestures outside the active drawing interaction.',
    'The top-left legend avoids the left drawing rail on web; mobile has no hidden legend collision from drawing surfaces.',
    'Object-tree ordering matches the actual render order on both Canvas and Skia.',
    'Text/property popovers or sheets do not obscure the edited object in a way that prevents confirming the result.',
  ],
};

export function createUserDrawingVisualEvidencePrNoteTemplate(
  matrix: UserDrawingVisualEvidenceMatrix = USER_DRAWING_VISUAL_EVIDENCE_MATRIX,
): string {
  const viewportLines = matrix.viewports.map((viewport) => `- ${viewport.label}:`).join('\n');
  const stateLines = matrix.states
    .map((state) =>
      state.status
        ? `- [ ] ${state.label} (web: ${state.status.web}, mobile: ${state.status.mobile}), if affected`
        : `- [ ] ${state.label}, if affected`,
    )
    .join('\n');
  const regressionCheckLines = matrix.regressionChecks.map((check) => `- [ ] ${check}`).join('\n');
  const knownGapLines = matrix.states
    .filter((state) => state.status && (state.status.web === 'known-gap' || state.status.mobile === 'known-gap'))
    .map((state) => {
      const status = state.status!;
      return `- ${state.label}: web ${status.web}, mobile ${status.mobile} - ${status.notes}`;
    });

  return [
    '## Drawing Visual Evidence',
    '',
    viewportLines,
    '',
    'Checked states:',
    stateLines,
    '',
    'Regression checks:',
    regressionCheckLines,
    '',
    'Known visual gaps:',
    knownGapLines.length > 0 ? knownGapLines.join('\n') : '- None recorded in the matrix for affected states.',
  ].join('\n');
}
