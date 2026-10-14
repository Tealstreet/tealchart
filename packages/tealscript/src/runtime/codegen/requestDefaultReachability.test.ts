import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiled, tryCompile } from './execute';

const start = Date.UTC(2026, 9, 1);
const bars = [3, 4, 5].map((close, index) => ({
  time: start + index * 60_000, open: close, high: close, low: close, close, volume: 1,
}));
const dailyBars = [{ ...bars[0]!, close: 41 }, { ...bars[0]!, time: start + 86_400_000, close: 42 }];
const seed = 'seed()=>request.security("REMOTE","1D",close,lookahead=barmerge.lookahead_on)';
const library = parse(`//@version=6
library("Default helper", dynamic_requests=true)
${seed}
export read(float value=seed())=>value`);

function run(source: string, imported = false) {
  const libraries = imported ? new Map([['W0/Default/1', library]]) : undefined;
  const ast = parse(source);
  const computedDefaults = ast.body.flatMap((statement) => statement.type === 'FunctionDeclaration'
    ? statement.params.flatMap((parameter) => parameter.defaultValue?.type === 'CallExpression' ? [parameter] : []) : []);
  const errors = checkProgram(ast, { libraries }).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  expect(errors).toEqual(computedDefaults.map((value) => expect.objectContaining({ code: 'invalid-parameter-default', message: 'The default value cannot be a function, variable or calculation.', line: (value.typeAnnotation?.loc ?? value.loc)?.start.line, column: (value.typeAnnotation?.loc ?? value.loc)?.start.column })));
  const compiled = tryCompile(ast, undefined, { libraries });
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars, undefined, {
    libraries,
    runtime: { timeframe: { period: '1' } },
    requestDatafeed: {
      getBars(query) {
        return { ok: true, context: { symbol: query.symbol, timeframe: query.timeframe, bars: dailyBars } };
      },
    },
  });
  expect(result).toBeDefined();
  expect(result!.errors).toEqual([]);
  expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
  return { values: result!.plots.map((plot) => plot.values), scripts: compiled.securityScripts.size };
}

describe('request helpers reached only through omitted defaults', () => {
  for (const title of ['original', 'reversed']) {
    for (const supplied of [false, true]) {
      it(`static ${title}, ${supplied ? 'supplied' : 'omitted'} seed`, () => {
        const result = run(`//@version=6
indicator("${title}", dynamic_requests=false)
${seed}
sample(float value,float extra=seed())=>value+extra
float selected=sample(close${supplied ? ',seed()' : ''})
plot(selected)
plot(request.security("REMOTE","1D",selected,lookahead=barmerge.lookahead_on))`);
        expect(result.values).toEqual([[44, 45, 46], [44, 45, 46]]);
      });
    }
  }
  for (const supplied of [false, true]) {
    it(`imported private seed, ${supplied ? 'supplied' : 'omitted'}`, () => {
      const result = run(`//@version=6
indicator("Imported default", dynamic_requests=true)
import W0/Default/1 as lib
outer()=>lib.read(${supplied ? 'request.security("REMOTE","1D",close,lookahead=barmerge.lookahead_on)' : ''})
plot(outer())`, true);
      expect(result.values).toEqual([[41, 41, 41]]);
    });
  }
  for (const depth of [0, 1, 3]) {
    for (const supplied of [false, true]) {
      it(`helper default depth ${depth}, ${supplied ? 'supplied' : 'omitted'}`, () => {
        const helpers = Array.from({ length: depth }, (_, index) =>
          `step${index}(float value=${index ? `step${index - 1}()` : 'seed()'})=>value`);
        const value = depth ? `step${depth - 1}()` : 'seed()';
        const result = run(`//@version=6
indicator("Transitive default")
${seed}
${helpers.join('\n')}
read(float value=${value})=>value
outer()=>read(${supplied ? value : ''})
plot(outer())`);
        expect(result.values).toEqual([[41, 41, 41]]);
      });
    }
  }
  for (const receiver of [false, true]) {
    it(`method default in ${receiver ? 'receiver' : 'function'} form`, () => {
      const result = run(`//@version=6
indicator("Method default")
${seed}
method read(float self,float value=seed())=>self+value
plot(${receiver ? 'close.read()' : 'read(close)'})`);
      expect(result.values).toEqual([[44, 45, 46]]);
    });
  }
  for (const unused of [false, true]) {
    it(`${unused ? 'unreachable' : 'supplied-only'} request default stays filtered`, () => {
      const result = run(`//@version=6
indicator("Unused default")
${seed}
read(float value=seed())=>value
plot(${unused ? 'close' : 'read(close)'})`);
      expect(result.values).toEqual([[3, 4, 5]]);
      expect(result.scripts).toBe(0);
    });
  }
  it('a private imported helper can forward to another private request helper', () => {
    const source = `//@version=6
indicator("Private helper chain")
import W0/Default/1 as lib
plot(lib.read())`;
    const extendedLibrary = parse(`//@version=6
library("Private helper chain",dynamic_requests=true)
${seed}
forward()=>seed()
export read(float value=forward())=>value`);
    const ast = parse(source);
    const libraries = new Map([['W0/Default/1', extendedLibrary]]);
    expect(checkProgram(ast, { libraries }).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const compiled = tryCompile(ast, undefined, { libraries });
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars, undefined, {
      libraries, runtime: { timeframe: { period: '1' } },
      requestDatafeed: {
        getBars(query) {
          return { ok: true, context: { symbol: query.symbol, timeframe: query.timeframe, bars: dailyBars } };
        },
      },
    });
    expect(result!.errors).toEqual([]);
    expect(result!.plots.map((plot) => plot.values)).toEqual([[41, 41, 41]]);
  });
  it('an unselected request-bearing helper overload stays filtered', () => {
    const result = run(`//@version=6
indicator("Selected helper")
seed(int value)=>request.security("REMOTE","1D",close,lookahead=barmerge.lookahead_on)
seed(float value)=>value
read(float value=seed(close))=>value
plot(read())`);
    expect(result.values).toEqual([[3, 4, 5]]);
    expect(result.scripts).toBe(0);
  });
  it('unselected overload default stays filtered', () => {
    const result = run(`//@version=6
indicator("Selected default")
${seed}
read(int value,int offset=1)=>value+offset
read(float value,float offset=seed())=>value+offset
plot(read(7))`);
    expect(result.values).toEqual([[8, 8, 8]]);
    expect(result.scripts).toBe(0);
  });
});
