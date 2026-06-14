import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createUserDrawingVisualEvidencePrNoteTemplate, USER_DRAWING_VISUAL_EVIDENCE_MATRIX } from './visualEvidence';

const readVisualEvidenceMarkdown = () => {
  const candidates = ['DRAWING_TOOLS_VISUAL_EVIDENCE.md', '../../DRAWING_TOOLS_VISUAL_EVIDENCE.md'];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) {
    throw new Error('Unable to locate DRAWING_TOOLS_VISUAL_EVIDENCE.md');
  }
  return readFileSync(path, 'utf8');
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('drawing visual evidence matrix', () => {
  it('keeps the markdown PR checklist aligned with the shared evidence matrix', () => {
    const markdown = readVisualEvidenceMarkdown();

    for (const state of USER_DRAWING_VISUAL_EVIDENCE_MATRIX.states) {
      const status = state.status!;
      expect(markdown).toContain(`- [ ] ${state.label} (web: ${status.web}, mobile: ${status.mobile}), if affected`);
      expect(markdown).toMatch(
        new RegExp(`\\| ${escapeRegExp(state.label)}\\s+\\| \`${status.web}\`\\s+\\| \`${status.mobile}\`\\s+\\|`),
      );
    }
  });

  it('defines required web and mobile viewport families', () => {
    expect(USER_DRAWING_VISUAL_EVIDENCE_MATRIX.viewports.map((viewport) => viewport.id)).toEqual([
      'desktop',
      'narrowDesktop',
      'mobilePortrait',
      'mobileLandscape',
    ]);
    expect(USER_DRAWING_VISUAL_EVIDENCE_MATRIX.viewports.filter((viewport) => viewport.target === 'web')).toHaveLength(
      2,
    );
    expect(
      USER_DRAWING_VISUAL_EVIDENCE_MATRIX.viewports.filter((viewport) => viewport.target === 'mobile'),
    ).toHaveLength(2);
    expect(
      USER_DRAWING_VISUAL_EVIDENCE_MATRIX.viewports.every((viewport) => viewport.width > 0 && viewport.height > 0),
    ).toBe(true);
  });

  it('keeps each visual state paired across web Canvas and mobile Skia evidence', () => {
    expect(USER_DRAWING_VISUAL_EVIDENCE_MATRIX.states.map((state) => state.id)).toEqual([
      'emptyChartDrawingRail',
      'activeToolDraft',
      'selectedDrawing',
      'floatingActionToolbar',
      'contextMenuLongPress',
      'objectTree',
      'textPropertyEditing',
      'keyboardModifierActions',
      'apiEventsPersistence',
      'paneSplitIndicators',
    ]);
    for (const state of USER_DRAWING_VISUAL_EVIDENCE_MATRIX.states) {
      expect(state.webEvidence.length).toBeGreaterThan(0);
      expect(state.mobileEvidence.length).toBeGreaterThan(0);
      expect(state.status).toBeDefined();
      const status = state.status!;
      expect(['ready', 'app-owned', 'known-gap']).toContain(status.web);
      expect(['ready', 'app-owned', 'known-gap']).toContain(status.mobile);
      expect(status.notes.length).toBeGreaterThan(0);
      expect(state.expectedChecks.length).toBeGreaterThan(0);
    }
  });

  it('generates a PR note template from the shared evidence matrix', () => {
    const template = createUserDrawingVisualEvidencePrNoteTemplate();

    expect(template).toContain('## Drawing Visual Evidence');
    for (const viewport of USER_DRAWING_VISUAL_EVIDENCE_MATRIX.viewports) {
      expect(template).toContain(`- ${viewport.label}:`);
    }
    for (const state of USER_DRAWING_VISUAL_EVIDENCE_MATRIX.states) {
      const status = state.status!;
      expect(template).toContain(`- [ ] ${state.label} (web: ${status.web}, mobile: ${status.mobile}), if affected`);
    }
    expect(template).toContain('Regression checks:');
    for (const check of USER_DRAWING_VISUAL_EVIDENCE_MATRIX.regressionChecks) {
      expect(template).toContain(`- [ ] ${check}`);
    }
    expect(template).toContain('Known visual gaps:');
    expect(template).toContain('None recorded in the matrix for affected states.');
  });

  it('tracks object-tree shared action and layering evidence', () => {
    const objectTree = USER_DRAWING_VISUAL_EVIDENCE_MATRIX.states.find((state) => state.id === 'objectTree');

    expect(objectTree).toMatchObject({
      status: {
        web: 'ready',
        mobile: 'ready',
      },
      expectedChecks: expect.arrayContaining([
        'Row order matches z-order.',
        'Row and bulk actions resolve through the same shared command pipeline.',
      ]),
    });
    expect(objectTree?.status?.notes).toContain('shared row, selection, rename, and z-order action models');
  });

  it('tracks text/property edit lifecycle evidence', () => {
    const textProperty = USER_DRAWING_VISUAL_EVIDENCE_MATRIX.states.find((state) => state.id === 'textPropertyEditing');

    expect(textProperty).toMatchObject({
      status: {
        web: 'ready',
        mobile: 'ready',
      },
      expectedChecks: expect.arrayContaining([
        'Double-click and double-tap resolve through the same shared edit-intent model.',
        'Text edits commit or cancel as one transaction.',
        'Properties controls dispatch through the same shared command pipeline.',
      ]),
    });
    expect(textProperty?.status?.notes).toContain('shared edit-intent');
    expect(textProperty?.status?.notes).toContain('built-in properties surfaces');
    expect(textProperty?.status?.notes).toContain('properties-surface control models');
  });

  it('tracks keyboard and modifier drawing parity evidence', () => {
    const keyboardModifier = USER_DRAWING_VISUAL_EVIDENCE_MATRIX.states.find(
      (state) => state.id === 'keyboardModifierActions',
    );

    expect(keyboardModifier).toMatchObject({
      status: {
        web: 'ready',
        mobile: 'ready',
      },
      expectedChecks: expect.arrayContaining([
        'Drawing shortcuts only run while chart keyboard focus owns the event.',
        'Undo, redo, delete, duplicate, copy, paste, select-all, and nudge route through shared commands.',
        'Web Shift-drag duplicate has a mobile touch-native duplicate-drag equivalent.',
        'Web Shift placement constraints have a mobile host-controlled constraint equivalent.',
      ]),
    });
    expect(keyboardModifier?.status?.notes).toContain('shared action and command models');
  });

  it('tracks API, event, and persistence parity evidence', () => {
    const apiEventsPersistence = USER_DRAWING_VISUAL_EVIDENCE_MATRIX.states.find(
      (state) => state.id === 'apiEventsPersistence',
    );

    expect(apiEventsPersistence).toMatchObject({
      status: {
        web: 'ready',
        mobile: 'ready',
      },
      expectedChecks: expect.arrayContaining([
        'Create, select, delete, duplicate, reorder, lock, hide, style, undo, redo, object-tree, and properties APIs have web and mobile siblings.',
        'Changed drawing commands emit the same command-event shape on web Canvas and mobile Skia.',
        'Unavailable targets return explicit no-op results without mutating drawing state.',
        'Import/export uses the same versioned drawing layout schema and excludes transient draft, selection, text-edit, and history state.',
      ]),
    });
    expect(apiEventsPersistence?.status?.notes).toContain('command-backed drawing APIs');
    expect(apiEventsPersistence?.status?.notes).toContain('persisted drawing schema/migrations');
  });

  it('keeps PR note generation compatible with custom legacy matrices without status fields', () => {
    const template = createUserDrawingVisualEvidencePrNoteTemplate({
      viewports: [
        {
          id: 'desktop',
          label: 'Desktop',
          width: 1280,
          height: 900,
          target: 'web',
          notes: 'Legacy custom matrix',
        },
      ],
      states: [
        {
          id: 'selectedDrawing',
          label: 'Selected drawing',
          webEvidence: 'Canvas handles',
          mobileEvidence: 'Skia handles',
          expectedChecks: ['Handles are stable'],
        },
      ],
      regressionChecks: ['No crash'],
    });

    expect(template).toContain('- [ ] Selected drawing, if affected');
    expect(template).toContain('None recorded in the matrix for affected states.');
  });
});
