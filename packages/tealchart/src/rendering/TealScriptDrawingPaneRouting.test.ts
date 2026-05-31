import type { DrawingOutput } from '@tealstreet/tealscript';
import type { ComputedPane } from '../types';

import { describe, expect, it } from 'vitest';

import { routeTealScriptDrawings } from './TealScriptDrawingPaneRouting';

const mainPane: ComputedPane = {
  id: 'main',
  type: 'main',
  heightRatio: 0.7,
  yMin: 100,
  yMax: 200,
  fixedRange: false,
  top: 0,
  height: 420,
  bottom: 420,
};

const indicatorPane: ComputedPane = {
  id: 'pane_1',
  type: 'indicator',
  heightRatio: 0.3,
  yMin: 0,
  yMax: 100,
  fixedRange: true,
  indicatorIds: ['script-rsi'],
  top: 420,
  height: 180,
  bottom: 600,
};

function line(overrides: Partial<Extract<DrawingOutput, { type: 'line' }>> = {}): DrawingOutput {
  return {
    type: 'line',
    id: 'line-1',
    scriptId: 'script-rsi',
    barIndex: 0,
    x1: 0,
    y1: 20,
    x2: 1,
    y2: 30,
    xloc: 'bar_index',
    extend: 'none',
    color: '#2962FF',
    width: 1,
    style: 'solid',
    ...overrides,
  };
}

function label(overrides: Partial<Extract<DrawingOutput, { type: 'label' }>> = {}): DrawingOutput {
  return {
    type: 'label',
    id: 'label-1',
    scriptId: 'script-rsi',
    barIndex: 0,
    x: 0,
    y: 50,
    xloc: 'bar_index',
    yloc: 'price',
    text: 'RSI',
    color: '#1f2937',
    textColor: '#ffffff',
    style: 'label_left',
    size: 'normal',
    ...overrides,
  };
}

describe('routeTealScriptDrawings', () => {
  it('routes drawings without a matching indicator pane to the main pane', () => {
    const drawing = label({ scriptId: 'overlay-script' });

    const routed = routeTealScriptDrawings([drawing], [mainPane, indicatorPane]);

    expect(routed.main).toEqual([drawing]);
    expect(routed.byPaneId.size).toBe(0);
  });

  it('routes drawings from non-overlay scripts to their indicator pane', () => {
    const drawing = label();

    const routed = routeTealScriptDrawings([drawing], [mainPane, indicatorPane]);

    expect(routed.main).toEqual([]);
    expect(routed.byPaneId.get('pane_1')).toEqual([drawing]);
  });

  it('routes forced-overlay drawings to the main pane even when their script has an indicator pane', () => {
    const drawing = line({ forceOverlay: true });

    const routed = routeTealScriptDrawings([drawing], [mainPane, indicatorPane]);

    expect(routed.main).toEqual([drawing]);
    expect(routed.byPaneId.size).toBe(0);
  });

  it('preserves per-pane drawing order', () => {
    const first = label({ id: 'label-1' });
    const second = line({ id: 'line-2' });

    const routed = routeTealScriptDrawings([first, second], [mainPane, indicatorPane]);

    expect(routed.byPaneId.get('pane_1')).toEqual([first, second]);
  });
});
