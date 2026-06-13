import { describe, expect, it } from 'vitest';

import { getUserDrawingPlacementMode, isUserDrawingDragPlacementTool } from './placement';

describe('user drawing placement modes', () => {
  it('classifies select, click, path drag, and two-anchor drag tools', () => {
    expect(getUserDrawingPlacementMode('select')).toBe('select');
    expect(getUserDrawingPlacementMode('horizontalLine')).toBe('click');
    expect(getUserDrawingPlacementMode('path')).toBe('pathDrag');
    expect(getUserDrawingPlacementMode('rectangle')).toBe('dragTwoAnchor');
    expect(getUserDrawingPlacementMode('trendLine')).toBe('dragTwoAnchor');
    expect(getUserDrawingPlacementMode('ellipse')).toBe('dragTwoAnchor');
  });

  it('keeps multi-anchor tools in click placement until they get dedicated gesture semantics', () => {
    expect(isUserDrawingDragPlacementTool('parallelChannel')).toBe(false);
    expect(getUserDrawingPlacementMode('parallelChannel')).toBe('click');
  });
});
