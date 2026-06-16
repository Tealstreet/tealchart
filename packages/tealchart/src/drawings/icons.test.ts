import { describe, expect, it } from 'vitest';

import {
  DRAWING_ICONS,
  getDrawingIconDefinition,
  resolveDrawingSelectedActionIconName,
  resolveDrawingToolIconName,
  resolveDrawingToolbarActionIconName,
} from './icons';
import {
  USER_DRAWING_TOOL_DESCRIPTORS,
  USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS,
} from './toolbar';

const VALID_TAGS = new Set(['path', 'circle', 'line', 'polyline', 'rect', 'ellipse']);

describe('drawing icon registry', () => {
  it('defines at least one geometry node per icon with valid tags and attrs', () => {
    for (const [name, definition] of Object.entries(DRAWING_ICONS)) {
      expect(definition.nodes.length, `${name} has nodes`).toBeGreaterThan(0);
      for (const node of definition.nodes) {
        expect(VALID_TAGS.has(node.tag), `${name} node tag ${node.tag}`).toBe(true);
        expect(Object.keys(node.attrs).length, `${name} node attrs`).toBeGreaterThan(0);
      }
    }
  });

  it('resolves authored tool icons to existing registry entries', () => {
    for (const descriptor of USER_DRAWING_TOOL_DESCRIPTORS) {
      const iconName = resolveDrawingToolIconName(descriptor.tool);
      if (iconName) {
        expect(getDrawingIconDefinition(iconName), `${descriptor.tool} -> ${iconName}`).toBeDefined();
      }
    }
  });

  it('resolves every toolbar action icon to an existing registry entry', () => {
    for (const descriptor of USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS) {
      const iconName = resolveDrawingToolbarActionIconName(descriptor.action);
      if (iconName) {
        expect(getDrawingIconDefinition(iconName), `${descriptor.action} -> ${iconName}`).toBeDefined();
      }
    }
  });

  it('returns undefined for tools without an authored icon', () => {
    expect(resolveDrawingToolIconName('gannSquareFixed')).toBeUndefined();
  });

  it('resolves selected-action commands to authored icons', () => {
    expect(resolveDrawingSelectedActionIconName({ type: 'toolbarAction', action: 'deleteSelected' })).toBe('trash');
    expect(resolveDrawingSelectedActionIconName({ type: 'styleAction', action: 'hideSelected' })).toBe('eyeOff');
    expect(resolveDrawingSelectedActionIconName({ type: 'styleAction', action: 'lockSelected' })).toBe('lock');
    expect(resolveDrawingSelectedActionIconName({ type: 'openProperties' })).toBe('gear');
    expect(resolveDrawingSelectedActionIconName({ type: 'editText', drawingId: 'd1' })).toBe('pencil');
  });

  it('skips icons for color swatch items and unmapped commands', () => {
    expect(resolveDrawingSelectedActionIconName({ type: 'toolbarAction', action: 'deleteSelected' }, '#ff0000')).toBeUndefined();
    expect(resolveDrawingSelectedActionIconName({ type: 'openObjectTree' })).toBeUndefined();
  });
});
