import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Pine enums manual: str.tostring returns the enum field title, including when
// enum values pass through parameters, returns, object fields and collections.
const authority = 'https://www.tradingview.com/pine-script-docs/language/enums/#utilizing-enums';

// Four baseline RED; documented propagation GREEN. Disabling title lowering
// makes all four RED again; restoring it makes them GREEN in a discarded copy.
describe(`enum value title propagation [${authority}]`, () => {
  for (const [name, declarations, expression, namedExpression] of [
    ['typed UDF parameter', 'render(Direction value) => str.tostring(value)\nrenderNamed(Direction value) => str.tostring(value=value)', 'render(Direction.north)', 'renderNamed(Direction.north)'],
    ['inferred UDF return assigned to a variable', 'choose() => Direction.north\nvalue = choose()', 'str.tostring(value)', 'str.tostring(value=value)'],
    ['UDT enum field', 'type Holder\n    Direction direction\nholder = Holder.new(Direction.north)', 'str.tostring(holder.direction)', 'str.tostring(value=holder.direction)'],
    ['enum array element', 'items = array.from(Direction.north)\ntyped = array.new<Direction>(1, Direction.north)', 'str.tostring(array.get(items, 0))', 'str.tostring(value=array.get(typed, 0))'],
  ] as const) {
    it(`preserves the explicit title through ${name}`, () => {
      const source = `//@version=6\nindicator("Enum title propagation")\nenum Direction\n    north = "North title"\n${declarations}\nplot(${expression} == "North title" ? 1 : 0, title="positional")\nplot(${namedExpression} == "North title" ? 1 : 0, title="named")\nplot(str.tostring("Direction.north") == "Direction.north" ? 1 : 0, title="string control")`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'positional').values).toEqual([1, 1]);
      expect(getPlot(result, 'named').values).toEqual([1, 1]);
      expect(getPlot(result, 'string control').values).toEqual([1, 1]);
    });
  }
});
