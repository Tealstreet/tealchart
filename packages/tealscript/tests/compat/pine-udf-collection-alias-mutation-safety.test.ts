import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function source(version: number, collection: string, kind: string, value: string, shape: string, typed: boolean) {
  const type = (element: string) => (collection === 'map' ? `map<string,${element}>` : `${collection}<${element}>`);
  const read =
    collection === 'map' ? 'map.get(values,"v")' : `${collection}.get(values,${collection === 'matrix' ? '0,0' : '0'})`;
  const write = (receiver: string) =>
    collection === 'map'
      ? `map.put(${receiver},"v",${value})`
      : `${collection}.set(${receiver},${collection === 'matrix' ? '0,0' : '0'},${value})`;
  const initial = kind === 'int' ? 'int(close)' : 'close+0.5';
  const create =
    collection === 'map'
      ? `map.new<string,${kind}>()`
      : collection === 'matrix'
        ? `matrix.new<${kind}>(1,1,${initial})`
        : `array.new<${kind}>(1,${initial})`;
  const annotation = typed ? `${type(kind)} ` : '';
  return `//@version=${version}
indicator("Collection alias mutation admission")
score(${shape === 'multiple-arguments' ? `${type('int')} first,` : ''}${type('int')} values) => 100+${read}
score(${shape === 'multiple-arguments' ? `${type('float')} first,` : ''}${type('float')} values) => 200+${read}
relay(${annotation}xs,${annotation}ys) =>
    a = xs
    b = a
    c = b
${shape === 'direct' || shape === 'multiple-arguments' ? `    ${write('b')}\n` : shape === 'typed-method-helper' ? '    key = 3\n    key.mutate(b)\n' : shape === 'helper' || shape === 'typed-helper' ? '    mutate(b)\n' : ''}    score(${shape === 'multiple-arguments' ? 'xs,c' : 'c'})
${shape === 'helper' || shape === 'typed-helper' || shape === 'typed-method-helper' ? `${shape === 'typed-method-helper' ? 'method ' : ''}mutate(${shape === 'typed-method-helper' ? 'int key,' : ''}${shape.startsWith('typed-') ? `${type('int')} ` : annotation}values) =>\n    ${write('values')}\n` : ''}${shape === 'upstream' ? `outer(${annotation}values) =>\n    ${write('values')}\n    relay(values,values)\n` : ''}xs = ${create}
ys = ${create}
${collection === 'map' ? `map.put(xs,"v",${initial})\nmap.put(ys,"v",${initial})\n` : ''}plot(${shape === 'upstream' ? 'outer(xs)' : 'relay(xs,ys)'})`;
}

function errors(source: string) {
  return checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('inherited collection alias chains refuse unvalidated element writes', () => {
  for (const version of [5, 6])
    for (const collection of ['array', 'matrix', 'map']) {
      for (const [kind, value, label] of [
        ['int', 'true', 'bool'],
        ['int', '"invalid"', 'string'],
        ['int', '1.5', 'nonintegral'],
        ['float', 'true', 'bool'],
        ['float', '"invalid"', 'string'],
      ]) {
        it(`v${version} ${collection} ${kind} refuses ${label} through an intermediate`, () => {
          expect(
            errors(source(version, collection, kind, value, 'direct', true)).some(
              (diagnostic) => diagnostic.code === 'type-mismatch',
            ),
          ).toBe(true);
          expect(errors(source(version, collection, kind, value, 'direct', false)).length).toBeGreaterThan(0);
        });
      }
      for (const shape of ['typed-helper', 'typed-method-helper']) {
        it(`v${version} ${collection} refuses an unresolved ${shape} binding`, () => {
          expect(
            errors(source(version, collection, 'float', '3', shape, true)).some(
              (diagnostic) => diagnostic.code === 'type-mismatch',
            ),
          ).toBe(true);
          expect(errors(source(version, collection, 'float', '3', shape, false)).length).toBeGreaterThan(0);
        });
      }
      for (const shape of ['helper', 'upstream', 'multiple-arguments']) {
        it(`v${version} ${collection} refuses an invalid write in a ${shape}`, () => {
          expect(
            errors(source(version, collection, 'int', 'true', shape, true)).some(
              (diagnostic) => diagnostic.code === 'type-mismatch',
            ),
          ).toBe(true);
          expect(errors(source(version, collection, 'int', 'true', shape, false)).length).toBeGreaterThan(0);
        });
      }
    }
});
