import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const bars = compatibilityBars.slice(0, 3);

function overloadSource(version: number, declarations: string[], calls: string): string {
  return `//@version=${version}\nindicator("Local overload selection")\n${declarations.join('\n')}\n${calls}\n`;
}

describe('local numeric overload selection', () => {
  for (const version of [5, 6]) {
    for (const reverse of [false, true]) {
      it(`selects scalar int/float overloads in v${version}, reversed=${reverse}`, () => {
        const declarations = ['choose(float value) => 300 + value', 'choose(int value) => 400 + value'];
        if (reverse) declarations.reverse();
        const source = overloadSource(version, declarations, 'plot(choose(1.25))\nplot(choose(7))');
        const semantic = checkProgram(parse(source));
        expect(semantic.diagnostics).toEqual([]);
        expect(semantic.userFunctionCallDeclarations.size).toBe(2);
        const result = runCompatScript(source, { bars });
        expect(result.errors).toEqual([]);
        expect(result.plots.map((plot) => plot.values)).toEqual([[301.25, 301.25, 301.25], [407, 407, 407]]);
      });

      it(`selects array element overloads in v${version}, reversed=${reverse}`, () => {
        const declarations = [
          'choose(array<float> values) => 300 + array.get(values, 0)',
          'choose(array<int> values) => 400 + array.get(values, 0)',
        ];
        if (reverse) declarations.reverse();
        const source = overloadSource(version, declarations, 'plot(choose(array.from(1.25)))\nplot(choose(array.from(7)))');
        const semantic = checkProgram(parse(source));
        expect(semantic.diagnostics).toEqual([]);
        expect(semantic.userFunctionCallDeclarations.size).toBe(2);
        const result = runCompatScript(source, { bars });
        expect(result.errors).toEqual([]);
        expect(result.plots.map((plot) => plot.values)).toEqual([[301.25, 301.25, 301.25], [407, 407, 407]]);
      });
    }

    it(`binds named arguments inside a local array wrapper in v${version}`, () => {
      const source = overloadSource(version, [
        'choose(array<float> values) => 300 + array.get(values, 0)',
        'choose(array<int> values) => 400 + array.get(values, 0)',
        'wrapped(array<int> values) => choose(values=values)',
      ], 'plot(wrapped(array.from(7)))');
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars });
      expect(result.errors).toEqual([]);
      expect(result.plots[0]?.values).toEqual([407, 407, 407]);
    });

    for (const reverse of [false, true]) {
      for (const call of ['choose(1, 2)', 'choose(second=2, first=1)']) {
        it(`refuses tied scalar overloads in v${version}, reversed=${reverse}: ${call}`, () => {
          const declarations = [
            'choose(int first, float second) => 300 + first + second',
            'choose(float first, int second) => 400 + first + second',
          ];
          if (reverse) declarations.reverse();
          const ast = parse(overloadSource(version, declarations, `plot(${call})`));
          expect(checkProgram(ast).diagnostics).toEqual(expect.arrayContaining([
            expect.objectContaining({ code: 'ambiguous-call', severity: 'error' }),
          ]));
          const compiled = tryCompile(ast);
          expect(compiled.success).toBe(false);
          expect(compiled.unsupported?.some((message) => message.includes('Ambiguous call to function choose'))).toBe(true);
        });
      }
    }

    it(`refuses unchecked compilation of tied local overloads in v${version}`, () => {
      const ast = parse(overloadSource(version, [
        'choose(int first, float second) => 300 + first + second',
        'choose(float first, int second) => 400 + first + second',
      ], 'plot(choose(1, 2))'));
      const compiled = tryCompile(ast);
      expect(compiled.success).toBe(false);
      expect(compiled.unsupported?.some((message) => message.includes('Ambiguous call to function choose'))).toBe(true);
    });

    it(`retains unambiguous mixed-type calls in v${version}`, () => {
      const source = overloadSource(version, [
        'choose(int first, float second) => 300 + first + second',
        'choose(float first, int second) => 400 + first + second',
      ], 'plot(choose(1, 2.5))\nplot(choose(1.5, 2))');
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars });
      expect(result.errors).toEqual([]);
      expect(result.plots.map((plot) => plot.values)).toEqual([[303.5, 303.5, 303.5], [403.5, 403.5, 403.5]]);
    });
  }
});
