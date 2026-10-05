import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Official array.abs/standardize reference entries admit int/float arrays only.
// Original981154c07e supersedes these previous-OK admission controls.
describe('owner40 documented nonnumeric abs and standardize refusals', () => {
  it.each([
    [
      'v7:11',
      '//@version=5\nindicator("Unsupported array.abs UDT")\ntype Point\n    float x\n\nvalues = array.from(Point.new(close))\nresult = array.abs(values)\nplot(close)\n',
    ],
    [
      'v7:12',
      '//@version=5\nindicator("Unsupported array abs box")\nvalues = array.new_box()\nresult = array.abs(values)\nplot(result.size())\n',
    ],
    [
      'v7:13',
      '//@version=5\nindicator("Unsupported array abs line")\nvalues = array.new_line()\nresult = array.abs(values)\nplot(result.size())\n',
    ],
    [
      'v7:14',
      '//@version=5\nindicator("Unsupported array abs bool")\nvalues = array.new_bool()\nresult = array.abs(values)\nplot(result.size())\n',
    ],
    [
      'v7:15',
      '//@version=5\nindicator("Unsupported array abs color")\nvalues = array.new_color()\nresult = array.abs(values)\nplot(result.size())\n',
    ],
    [
      'v7:16',
      '//@version=5\nindicator("Unsupported array abs table")\nvalues = array.new_table()\nresult = array.abs(values)\nplot(result.size())\n',
    ],
    [
      'v7:17',
      '//@version=5\nindicator("Unsupported array abs label")\nvalues = array.new_label()\nresult = array.abs(values)\nplot(result.size())\n',
    ],
    [
      'v7:18',
      '//@version=5\nindicator("Unsupported array abs string")\nvalues = array.new_string()\nresult = array.abs(values)\nplot(array.size(result))\n',
    ],
    [
      'v7:19',
      '//@version=5\nindicator("Unsupported array abs polyline")\nvalues = array.new_polyline(0)\nresult = array.abs(values)\nplot(result.size())\n',
    ],
    [
      'v7:20',
      '//@version=5\nindicator("Unsupported array abs linefill")\nvalues = array.new_linefill(0)\nresult = array.abs(values)\nplot(result.size())\n',
    ],
    [
      'v7:21',
      '//@version=5\nindicator("Unsupported array abs chart point")\npoint = chart.point.now(close)\nvalues = array.from(point)\nresult = array.abs(values)\nplot(result.size())\n',
    ],
    [
      'v56:812',
      '//@version=5\nindicator("Unsupported array abs label method")\nvalues = array.new_label()\nresult = values.abs()\nplot(result.size())\n',
    ],
    [
      'v56:938',
      '//@version=5\nindicator("Unsupported array standardize box method")\nvalues = array.new_box()\nstandardized = values.standardize()\nplot(close)\n',
    ],
    [
      'v56:1261',
      '//@version=5\nindicator("Unsupported array.standardize UDT method")\ntype Point\n    float x\n\nvalues = array.from(Point.new(close))\nstandardized = values.standardize()\nplot(close)\n',
    ],
    [
      'v56:1313',
      '//@version=5\nindicator("Unsupported array standardize linefill method")\nvalues = array.new_linefill(0)\nstandardized = values.standardize()\nplot(close)\n',
    ],
    [
      'v56:1517',
      '//@version=5\nindicator("Unsupported array standardize table method")\nvalues = array.new_table()\nstandardized = values.standardize()\nplot(close)\n',
    ],
  ])('%s refuses nonnumeric collection elements', (_id, source) => {
    const member = source.includes('standardize(') ? 'standardize' : 'abs';
    const reference = `https://www.tradingview.com/pine-script-reference/v6/#fun_array.${member}`;
    expect(
      checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error'),
      reference,
    ).toEqual([
      expect.objectContaining({
        code: 'type-mismatch',
        message: expect.stringContaining(`array.${member} requires int or float collection elements`),
      }),
    ]);
  });

  for (const member of ['abs', 'standardize']) {
    for (const kind of ['int', 'float']) {
      for (const route of ['namespace', 'receiver']) {
        it(`${member} retains ${kind} ${route} admission in Pine v5`, () => {
          const values = kind === 'int' ? '17, -8' : '17.5, -8.5';
          const call = route === 'namespace' ? `array.${member}(values)` : `values.${member}()`;
          const source = `//@version=5\nindicator("Numeric arrays")\nvalues = array.from(${values})\nresult = ${call}\nplot(close)`;
          expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
        });
      }
    }
  }
});
