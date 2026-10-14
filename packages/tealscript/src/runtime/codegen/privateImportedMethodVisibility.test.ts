import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiled, tryCompile } from './execute';

const bars = [3, 4, 5].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close + 1, low: close - 1, close, volume: 1,
}));

function program(version: number, declarations: string, body: string) {
  const libraries = new Map([['QA/Lib/1', parse(`//@version=${version}\nlibrary("Lib")\n${declarations}`)]]);
  const ast = parse(`//@version=${version}\nindicator("QA")\nimport QA/Lib/1 as lib\n${body}`);
  return { ast, libraries };
}

function values(version: number, declarations: string, body: string) {
  const { ast, libraries } = program(version, declarations, body);
  expect(checkProgram(ast, { libraries }).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast, undefined, { libraries });
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars, undefined, { libraries });
  expect(result?.errors).toEqual([]);
  expect(result?.profile.compiledBarErrors?.firstMessage).toBeUndefined();
  return result?.plots.map((plot) => plot.values);
}

// Libraries manual: only exported definitions are visible to importing scripts.
describe('private imported method visibility', () => {
  for (const version of [5, 6]) {
    const privateLibrary = 'export anchor(float x)=>x\nmethod pick(float self)=>self+10';
    for (const body of ['plot((3.5).pick())', 'read(float x) => x.pick()\nplot(read(3.5))', 'read(x) => x.pick()\nplot(read(3.5))']) {
      it(`refuses private receiver calls in v${version}: ${body}`, () => {
        const { ast, libraries } = program(version, privateLibrary, body);
        const errors = checkProgram(ast, { libraries }).diagnostics.filter((d) => d.severity === 'error');
        expect(errors).toEqual([expect.objectContaining({
          code: 'private-library-method', message: version === 6 ? "Could not find method or method reference 'float.pick'" : "Could not find method or method reference 'pick' for 'float'",
        })]);
        expect(tryCompile(ast, undefined, { libraries }).success).toBe(false);
      });
    }
    it(`keeps private methods callable inside their library in v${version}`, () => {
      expect(values(version, 'method pick(float self)=>self+10\nexport forward(float x)=>x.pick()', 'plot(lib.forward(close))'))
        .toEqual([[13, 14, 15]]);
    });
    it(`keeps library-local private UDT forwarding in v${version}`, () => {
      expect(values(version, 'export type Token\n    float value\nmethod pick(Token self)=>self.value+10\nexport forward(Token x)=>x.pick()', 'plot(lib.forward(lib.Token.new(close)))'))
        .toEqual([[13, 14, 15]]);
    });
    it(`keeps a local method with the same name in v${version}`, () => {
      expect(values(version, privateLibrary, 'method pick(float self)=>self+20\nplot(close.pick())'))
        .toEqual([[23, 24, 25]]);
    });
    it(`keeps exported methods with the same name in v${version}`, () => {
      expect(values(version, privateLibrary.replace('method pick', 'export method pick'), 'plot((3.5).pick())'))
        .toEqual([[13.5, 13.5, 13.5]]);
    });
    it(`keeps built-in collection methods with a private name collision in v${version}`, () => {
      expect(values(version, 'export anchor(float x)=>x\nmethod size(array<float> self)=>array.size(self)+10', 'plot(array.from(close).size())'))
        .toEqual([[1, 1, 1]]);
    });
  }
});

describe('transitive private imported method visibility', () => {
  for (const version of [5, 6]) {
    function importedProgram(exported: boolean, called: string) {
      const library = `//@version=${version}\nlibrary("A")\nexport anchor(float x)=>x\n${exported ? 'export ' : ''}method pick(float self)=>self+10\n${exported ? 'export ' : ''}f(float x)=>x+10\nexport forward(float x)=>x.pick()\nexport method identity(float self)=>self\nexport type Token\n    float val\nmethod secret(Token self)=>self.val+20\nexport tokenRead(Token self)=>self.secret()\n`;
      const forwarding = `//@version=${version}\nlibrary("B")\nimport QA/A/1 as a\nexport public(float x)=>a.forward(x)\nexport illegal(float x)=>x.pick()\n`;
      const libraries = new Map([['QA/A/1', parse(library)], ['QA/B/1', parse(forwarding)]]);
      const ast = parse(`//@version=${version}\nindicator("QA")\nimport QA/B/1 as b\nplot(b.${called}(close))`);
      return { ast, libraries };
    }

    it(`refuses a private method through a second library in v${version}`, () => {
      const { ast, libraries } = importedProgram(false, 'illegal');
      expect(checkProgram(ast, { libraries }).diagnostics.filter((d) => d.severity === 'error')).toEqual([
        expect.objectContaining({ code: 'private-library-method', message: version === 6 ? "Could not find method or method reference 'x.pick'" : "Could not find method or method reference 'pick' for 'x'" }),
      ]);
      const compiled = tryCompile(ast, undefined, { libraries });
      expect(compiled.success).toBe(false);
      expect(compiled.unsupported).toEqual([version === 6 ? "Could not find method or method reference 'x.pick'" : "Could not find method or method reference 'pick' for 'x'"]);
    });

    for (const [exported, called] of [[false, 'public'], [true, 'public'], [true, 'illegal']] as const) {
      it(`preserves exported forwarding in v${version}: ${exported}/${called}`, () => {
        const { ast, libraries } = importedProgram(exported, called);
        expect(checkProgram(ast, { libraries }).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
        const compiled = tryCompile(ast, undefined, { libraries });
        expect(compiled.success).toBe(true);
        const result = executeCompiled(compiled, bars, undefined, { libraries });
        expect(result?.errors).toEqual([]);
        expect(result?.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        expect(result?.plots.map((plot) => plot.values)).toEqual([[13, 14, 15]]);
      });
    }
  }
});
