import type { PlotOutput } from '@tealstreet/tealscript';

import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { testPlot } from '../../test/nativePlotPaintHarness';
import { NativeIndicatorStyleOverlay } from './NativeIndicatorStyleOverlay';

function show(plots = [testPlot({ title: 'Editable' }), testPlot({ id: 'locked', title: 'Locked', editable: false })]) {
  const save = vi.fn();
  const close = vi.fn();
  render(
    <NativeIndicatorStyleOverlay
      plots={plots}
      overrides={[]}
      name="Study"
      backgroundColor="black"
      textColor="white"
      onSave={save}
      onClose={close}
    />,
  );
  return { save, close };
}
describe('native indicator Style sheet', () => {
  it('omits locked controls and applying untouched settings preserves series styles', () => {
    const { save } = show();
    expect(screen.queryByLabelText('Locked color')).toBeNull();
    fireEvent.click(screen.getByText('Apply'));
    expect(save).toHaveBeenCalledWith([]);
  });
  it('accepts incomplete color text locally and saves valid color/width/style choices', () => {
    const { save } = show();
    fireEvent.change(screen.getByLabelText('Editable color'), { target: { value: '#ab' } });
    expect((screen.getByLabelText('Editable color') as HTMLTextAreaElement).value).toBe('#ab');
    fireEvent.change(screen.getByLabelText('Editable color'), { target: { value: '#abcdef80' } });
    fireEvent.change(screen.getByLabelText('Editable width'), { target: { value: '4' } });
    fireEvent.click(screen.getByLabelText('Editable dashed'));
    fireEvent.click(screen.getByText('Apply'));
    expect(save).toHaveBeenCalledWith([{ plotId: 'p', color: '#abcdef80', linewidth: 4, lineStyle: 'dashed' }]);
  });
  it('labels all output families, including nonnumeric colors and fills', () => {
    const families: PlotOutput['type'][] = [
      'plot',
      'plotshape',
      'plotchar',
      'plotarrow',
      'plotbar',
      'plotcandle',
      'bgcolor',
      'barcolor',
      'fill',
      'hline',
    ];
    show(families.map((type) => testPlot({ type, title: type, id: type })));
    for (const family of families) expect(screen.getByText(family)).toBeDefined();
  });
  it('cancels without saving and resets to the authored worker series', () => {
    const { save, close } = show();
    fireEvent.click(screen.getByText('Cancel'));
    expect(close).toHaveBeenCalledOnce();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Reset to script'));
    expect(save).toHaveBeenCalledWith([]);
  });
});
