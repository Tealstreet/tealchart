import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Reference-derived witnesses for receiver methods; no renderer pixel claims.
function run(body: string) {
  const source = `//@version=6\nindicator("Ledger 25 drawings")\n${body}`;
  expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const result = runCompatScript(source, { bars: [compatibilityBars[0]!] });
  expect(result.errors).toEqual([]);
  return result;
}

describe('ledger gaps 25 drawing receiver contracts', () => {
  for (const [ranks, call] of [
    ['968–969', 'id.delete()'],
    ['970–971', 'id.set_left(1)'],
    ['978–979', 'id.set_second_point(chart.point.from_index(1, 19))'],
    ['998–999', 'value = id.get_right()'],
  ]) {
    it(`ranks ${ranks}: a known integer cannot replace a drawing receiver in ${call}`, () => {
      const source = `//@version=6\nindicator("Ledger 25 drawing receiver type")\nint id = 17\n${call}`;
      const errors = checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
      expect(errors).toEqual([
        expect.objectContaining({
          code: 'type-mismatch',
          message: expect.stringContaining('requires a drawing receiver'),
        }),
      ]);
    });
  }

  it('ranks 968–969: polyline receiver deletion removes the ID and repeated deletion has no effect', () => {
    const result = run(`
points = array.from(chart.point.from_index(0, 11), chart.point.from_index(1, 13))
path = polyline.new(points)
plot(array.size(polyline.all), "Before")
path.delete()
plot(array.size(polyline.all), "Deleted")
path.delete()
plot(array.size(polyline.all), "Repeated")
`);
    expect(getPlot(result, 'Before').values).toEqual([1]);
    expect(getPlot(result, 'Deleted').values).toEqual([0]);
    expect(getPlot(result, 'Repeated').values).toEqual([0]);
    expect(result.drawings.filter((drawing) => drawing.type === 'polyline')).toEqual([]);
  });

  it('ranks 970–971: box receiver set_left changes only the left coordinate', () => {
    const result = run(`
id = box.new(0, 17, 3, 11)
id.set_left(1)
plot(id.get_left(), "Left")
plot(id.get_right(), "Right")
plot(id.get_top(), "Top")
plot(id.get_bottom(), "Bottom")
`);
    expect(['Left', 'Right', 'Top', 'Bottom'].map((name) => getPlot(result, name).values[0])).toEqual([1, 3, 17, 11]);
    expect(result.drawings.find((drawing) => drawing.type === 'box')).toMatchObject({
      left: 1,
      right: 3,
      top: 17,
      bottom: 11,
    });
  });

  for (const timed of [false, true]) {
    it(`ranks 978–979: line receiver copies the second point's ${timed ? 'time' : 'index'} and price`, () => {
      const result = run(`
first = chart.point.new(time, 0, 11)
second = chart.point.new(time + 60000, 1, 13)
replacement = chart.point.new(time + 120000, 2, 19)
id = line.new(first, second, xloc=${timed ? 'xloc.bar_time' : 'xloc.bar_index'})
id.set_second_point(replacement)
replacement.price := 99
plot(id.get_x1(), "First X")
plot(id.get_y1(), "First Y")
plot(id.get_x2(), "Second X")
plot(id.get_y2(), "Second Y")
`);
      expect(getPlot(result, 'First X').values).toEqual([timed ? compatibilityBars[0]!.time : 0]);
      expect(getPlot(result, 'First Y').values).toEqual([11]);
      expect(getPlot(result, 'Second X').values).toEqual([timed ? compatibilityBars[0]!.time + 120000 : 2]);
      expect(getPlot(result, 'Second Y').values).toEqual([19]);
    });
  }

  for (const timed of [false, true]) {
    it(`ranks 998–999: box receiver get_right returns its ${timed ? 'millisecond timestamp' : 'bar index'}`, () => {
      const right = timed ? 'time + 120000' : '2';
      const left = timed ? 'time' : '0';
      const result = run(`
id = box.new(${left}, 17, ${right}, 11, xloc=${timed ? 'xloc.bar_time' : 'xloc.bar_index'})
plot(id.get_right(), "Right")
`);
      expect(getPlot(result, 'Right').values).toEqual([timed ? compatibilityBars[0]!.time + 120000 : 2]);
    });
  }
});
