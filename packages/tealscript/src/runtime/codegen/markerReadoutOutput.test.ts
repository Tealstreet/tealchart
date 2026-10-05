import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import { ExecutionContext } from '../context';

const bars = [0, 1, 2].map((close, index) => ({
  time: (index + 1) * 1000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

describe('Pine marker readout series', () => {
  it('retains zero and false for readouts while suppressing their markers', () => {
    const result = executeScript(
      parse(`//@version=6
indicator("Markers")
plotshape(close, title="Numeric")
plotchar(close > 1, title="Boolean")`),
      bars,
    );
    expect(result.plots[0]).toMatchObject({ values: [null, 1, 2], displayValues: [0, 1, 2] });
    expect(result.plots[1]).toMatchObject({ values: [null, null, 1], displayValues: [0, 0, 1] });
  });

  it('truncates readout values when the realtime bar is replaced', () => {
    const ctx = new ExecutionContext();
    ctx.registerPlot({
      id: 'marker',
      type: 'plotshape',
      title: 'Marker',
      color: '#ff0000',
      displayValues: [0, 1, 2],
    });
    ctx.truncatePlots(2);
    expect(ctx.getPlots()[0]).toMatchObject({ displayValues: [0, 1] });
  });
});
