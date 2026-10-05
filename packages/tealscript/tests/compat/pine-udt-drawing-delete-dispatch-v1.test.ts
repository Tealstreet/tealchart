import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-docs/language/methods/#method-overloading';
const header =
  '//@version=6\nindicator("Pivot graphic delete dispatch")\ntype pivotGraphic\n    line pivotLine\n    label pivotLabel\n';
const create = 'graphic = pivotGraphic.new(line.new(bar_index, 1, bar_index+1, 2), label.new(bar_index, 1, "pivot"))';
const plots = 'plot(array.size(line.all), "Lines")\nplot(array.size(label.all), "Labels")\nplot(close, "Continued")';

describe('UDT delete methods coexist with drawing delete methods', () => {
  for (const route of ['direct', 'array', 'matrix-row']) {
    it(`${route} calls the custom UDT method and builtin deletes for its line and label fields`, () => {
      const call =
        route === 'direct'
          ? 'graphic.delete()'
          : route === 'array'
            ? 'graphics = array.from(graphic)\nfor item in graphics\n    item.delete()'
            : 'graphics = matrix.new<pivotGraphic>(1, 1, graphic)\noldGraphics = graphics.remove_row(0)\nfor item in oldGraphics\n    item.delete()';
      const result = runCompatScript(`${header}method delete(pivotGraphic graphic) =>
    graphic.pivotLine.delete()
    graphic.pivotLabel.delete()
${create}
${call}
${plots}`);
      expect(result.errors, reference).toEqual([]);
      expect(result.profile?.swallowedErrors ?? [], reference).toEqual([]);
      expect(getPlot(result, 'Lines').values, reference).toEqual(compatibilityBars.map(() => 0));
      expect(getPlot(result, 'Labels').values, reference).toEqual(compatibilityBars.map(() => 0));
      expect(getPlot(result, 'Continued').values, reference).toEqual(compatibilityBars.map((bar) => bar.close));
    });
  }

  it('the custom UDT delete remains active when its body uses namespace drawing deletes', () => {
    const result = runCompatScript(`${header}method delete(pivotGraphic graphic) =>
    line.delete(graphic.pivotLine)
    label.delete(graphic.pivotLabel)
${create}
graphic.delete()
${plots}`);
    expect(result.errors, reference).toEqual([]);
    expect(result.profile?.swallowedErrors ?? [], reference).toEqual([]);
    expect(getPlot(result, 'Lines').values, reference).toEqual(compatibilityBars.map(() => 0));
    expect(getPlot(result, 'Labels').values, reference).toEqual(compatibilityBars.map(() => 0));
    expect(getPlot(result, 'Continued').values, reference).toEqual(compatibilityBars.map((bar) => bar.close));
  });

  it('a user-defined delete that updates its receiver does not become a builtin call', () => {
    const result = runCompatScript(`//@version=6
indicator("Custom delete effect")
type Record
    int value
method delete(Record receiver) =>
    receiver.value := 43
value = Record.new(-8)
value.delete()
plot(value.value, "Value")`);
    expect(result.errors, reference).toEqual([]);
    expect(result.profile?.swallowedErrors ?? [], reference).toEqual([]);
    expect(getPlot(result, 'Value').values, reference).toEqual(compatibilityBars.map(() => 43));
  });
});
