import { describe, expect, it } from 'vitest';

import {
  getUserDrawingToolDescriptor,
  USER_DRAWING_TOOL_DESCRIPTORS,
  USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS,
} from './toolbar';

describe('user drawing toolbar descriptors', () => {
  it('orders every supported drawing tool once', () => {
    expect(USER_DRAWING_TOOL_DESCRIPTORS.map((descriptor) => descriptor.tool)).toEqual([
      'select',
      'trendLine',
      'ray',
      'horizontalLine',
      'verticalLine',
      'rectangle',
      'textLabel',
    ]);
    expect(new Set(USER_DRAWING_TOOL_DESCRIPTORS.map((descriptor) => descriptor.tool)).size).toBe(
      USER_DRAWING_TOOL_DESCRIPTORS.length,
    );
  });

  it('provides compact icons and accessible labels for tools and actions', () => {
    for (const descriptor of [...USER_DRAWING_TOOL_DESCRIPTORS, ...USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS]) {
      expect(descriptor.icon.length).toBeGreaterThan(0);
      expect(descriptor.label.length).toBeGreaterThan(0);
    }
  });

  it('resolves tool descriptors by tool id', () => {
    expect(getUserDrawingToolDescriptor('rectangle')).toEqual(
      expect.objectContaining({ tool: 'rectangle', label: 'Rectangle' }),
    );
  });
});
