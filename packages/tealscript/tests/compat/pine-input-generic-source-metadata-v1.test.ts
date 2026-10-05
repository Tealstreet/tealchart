import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = [2, 3, 4].map((close, index) => ({
  time: index * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));
const run = (call: string, version = 6) =>
  executeScript(
    parse(`//@version=${version}
indicator("INPUT-GENERIC-SOURCE-POSITIONAL-AUTHORITY")
selected=${call}
plot(close,"OUTCOME")`),
    bars,
  );

describe('Generic source input metadata positions', () => {
  // b994 v4 native source5645a581: generic input source overload, not input.source.
  it('binds generic source positional inline, group and tooltip in native order', () => {
    const result = run('input(close,"SourceTitle","SLOT3","SLOT4","SLOT5",display.none,true)');
    expect(result.errors).toEqual([]);
    expect(result.inputs).toHaveLength(1);
    expect(result.inputs[0]).toMatchObject({
      type: 'source',
      title: 'SourceTitle',
      inline: 'SLOT3',
      group: 'SLOT4',
      tooltip: 'SLOT5',
      display: 0,
      active: true,
    });
    expect(result.plots[0]!.values).toEqual([2, 3, 4]);
  });
  it('preserves generic source named metadata', () => {
    const result = run(
      'input(close,title="SourceTitle",inline="SLOT3",group="SLOT4",tooltip="SLOT5",display=display.none,active=true)',
    );
    expect(result.errors).toEqual([]);
    expect(result.inputs[0]).toMatchObject({
      type: 'source',
      title: 'SourceTitle',
      inline: 'SLOT3',
      group: 'SLOT4',
      tooltip: 'SLOT5',
      display: 0,
      active: true,
    });
  });
  it('preserves primitive generic input positional metadata order', () => {
    const result = run('input(7,"NumberTitle","SLOT3","SLOT4","SLOT5",display.none,true)');
    expect(result.errors).toEqual([]);
    expect(result.inputs[0]).toMatchObject({
      type: 'int',
      title: 'NumberTitle',
      tooltip: 'SLOT3',
      inline: 'SLOT4',
      group: 'SLOT5',
      display: 0,
      active: true,
    });
  });
  it('preserves pre-v6 source metadata binding pending native evidence', () => {
    const result = run('input(close,"LegacyTitle","SLOT3","SLOT4","SLOT5",display.none,true)', 5);
    expect(result.errors).toEqual([]);
    expect(result.inputs[0]).toMatchObject({
      type: 'source',
      title: 'LegacyTitle',
      tooltip: 'SLOT3',
      inline: 'SLOT4',
      group: 'SLOT5',
      display: 0,
      active: true,
    });
  });
  it('preserves typed input.source metadata and confirm tail', () => {
    const result = run('input.source(close,"TypedTitle","SLOT3","SLOT4","SLOT5",display.none,false,true)');
    expect(result.errors).toEqual([]);
    expect(result.inputs[0]).toMatchObject({
      type: 'source',
      title: 'TypedTitle',
      tooltip: 'SLOT3',
      inline: 'SLOT4',
      group: 'SLOT5',
      display: 0,
      active: false,
      confirm: true,
    });
  });
});
