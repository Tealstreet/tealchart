import { describe, expect, it } from 'vitest';

import {
  createUserDrawingVisualEvidencePrNoteTemplate,
  USER_DRAWING_VISUAL_EVIDENCE_MATRIX,
} from './visualEvidence';

describe('drawing visual evidence matrix', () => {
  it('defines required web and mobile viewport families', () => {
    expect(USER_DRAWING_VISUAL_EVIDENCE_MATRIX.viewports.map((viewport) => viewport.id)).toEqual([
      'desktop',
      'narrowDesktop',
      'mobilePortrait',
      'mobileLandscape',
    ]);
    expect(USER_DRAWING_VISUAL_EVIDENCE_MATRIX.viewports.filter((viewport) => viewport.target === 'web')).toHaveLength(2);
    expect(USER_DRAWING_VISUAL_EVIDENCE_MATRIX.viewports.filter((viewport) => viewport.target === 'mobile')).toHaveLength(2);
    expect(USER_DRAWING_VISUAL_EVIDENCE_MATRIX.viewports.every((viewport) => viewport.width > 0 && viewport.height > 0)).toBe(
      true,
    );
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
      expect(template).toContain(
        `- [ ] ${state.label} (web: ${status.web}, mobile: ${status.mobile}), if affected`,
      );
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
        web: 'app-owned',
        mobile: 'app-owned',
      },
      expectedChecks: expect.arrayContaining([
        'Row order matches z-order.',
        'Row and bulk actions resolve through the same shared command pipeline.',
      ]),
    });
    expect(objectTree?.status?.notes).toContain('shared row, selection, rename, and z-order action models');
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
