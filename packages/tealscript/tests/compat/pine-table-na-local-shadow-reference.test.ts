import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Existing local callable binding is a TealScript regression control.
// NA expectations follow the string overload and deleted-table contract.
describe('table NA checks preserve local callable binding', () => {
  for (const method of [false, true]) {
    for (const generic of [false, true]) {
      it(`${method ? 'method' : 'namespace'} deletion preserves ${generic ? 'generic' : 'typed'} table-named UDF string returns`, () => {
        const tail = generic ? ', false' : '';
        const source = `//@version=6
indicator("Local table shadow")
${generic ? 'table(value, bool marker)' : 'table(string value)'} => value
var t=table.new(position.top_left,1,1)
if bar_index==1
    ${method ? 't.delete()' : 'table.delete(t)'}
s=table("table_table.new_0_0"${tail})
plot(na(s)?1:0,"Text")
plot(na(table("table_table.new_0_0"${tail}))?1:0,"Direct text")
plot(na(t)?1:0,"Reference")
${generic ? 'string absent=na\nplot(na(table(t, false))?1:0,"Returned reference")\nplot(na(table(7, false))?1:0,"Number")\nplot(na(table(absent, false))?1:0,"Missing")' : ''}`;
        expect(checkProgram(parse(source)).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors).toEqual([]);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        expect(getPlot(result, 'Text').values).toEqual([0, 0, 0]);
        expect(getPlot(result, 'Direct text').values).toEqual([0, 0, 0]);
        expect(getPlot(result, 'Reference').values).toEqual([0, 1, 1]);
        if (generic) {
          expect(getPlot(result, 'Returned reference').values).toEqual([0, 1, 1]);
          expect(getPlot(result, 'Number').values).toEqual([0, 0, 0]);
          expect(getPlot(result, 'Missing').values).toEqual([1, 1, 1]);
        }
      });
    }
  }
});
