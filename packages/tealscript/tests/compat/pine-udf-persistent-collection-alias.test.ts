import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const bars = [23, 25, 29].map((close, index) => ({
  time: Date.UTC(2026, 9, 2) + index * 60000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 17,
}));

describe('persistent local collection aliases inherit the written call type', () => {
  for (const version of [5, 6])
    for (const context of ['direct', 'security'])
      for (const collection of ['array', 'matrix', 'map'])
        for (const order of ['int-first', 'float-first']) {
          it(`v${version} ${context} ${collection} ${order}`, () => {
            const first = order === 'int-first' ? 'int' : 'float';
            const second = order === 'int-first' ? 'float' : 'int';
            const type = (kind: string) => (collection === 'map' ? `map<string,${kind}>` : `${collection}<${kind}>`);
            const create = (kind: string) =>
              collection === 'map'
                ? `map.new<string,${kind}>()`
                : collection === 'matrix'
                  ? `matrix.new<${kind}>(1,1,0)`
                  : `array.new<${kind}>(1,0)`;
            const execute = (typed: boolean) => {
              const header = typed
                ? `relayInt(${type('int')} xs) =>\n    var copied = xs\n    score(copied)\nrelayFloat(${type('float')} xs) =>\n    var copied = xs\n    score(copied)`
                : 'relay(xs) =>\n    var copied = xs\n    score(copied)';
              const call = (kind: string) =>
                `${typed ? (kind === 'int' ? 'relayInt' : 'relayFloat') : 'relay'}(${create(kind)})`;
              const tuple = `[${call(first)},${call(second)}]`;
              const source = `//@version=${version}
indicator("Persistent collection alias overload")
score(${type('int')} xs) => 10
score(${type('float')} xs) => 20
${header}
${context === 'direct' ? `fixtureFirstResult = ${call(first)}
fixtureSecondResult = ${call(second)}
fixturePair() => [fixtureFirstResult,fixtureSecondResult]
` : ''}[x,y] = ${context === 'security' ? `request.security("REMOTE:ALT","1",${tuple})` : 'fixturePair()'}
plot(x)
plot(y)
`;
              const ast = parse(source);
              expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
              const compiled = tryCompile(ast);
              expect(compiled.success).toBe(true);
              const result = executeCompiled(compiled, bars, undefined, {
                requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'REMOTE:ALT', timeframe: '1', bars }]),
                runtime: { timeframe: { period: '1' } },
              });
              expect(result).toBeDefined();
              expect(result!.errors).toEqual([]);
              expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
              return result!.plots.map((plot) => plot.values);
            };
            const typedValues = execute(true);
            expect(typedValues).toEqual([
              Array(3).fill(first === 'int' ? 10 : 20),
              Array(3).fill(second === 'int' ? 10 : 20),
            ]);
            expect(execute(false)).toEqual(typedValues);
          });
        }
});
