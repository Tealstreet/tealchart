import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const errors = (source: string) =>
  checkProgram(parse(source)).diagnostics.filter((entry) => entry.severity === 'error');
const prefix = (version: number) => `//@version=${version}\nindicator("Instantiated receivers")\n`;
const scalars = [
  { kind: 'int', actual: '4' },
  { kind: 'float', actual: '4.0' },
  { kind: 'bool', actual: 'true' },
  { kind: 'string', actual: '"value"' },
  { kind: 'color', actual: 'color.red' },
] as const;
const calls = [
  'get(0)',
  'set(0, 1)',
  'push(1)',
  'size()',
  'pop()',
  'first()',
  'last()',
  'clear()',
  'sort()',
  'reverse()',
  'get(0, 0)',
  'set(0, 0, 1)',
  'rows()',
  'columns()',
  'row(0)',
  'col(0)',
  'get("key")',
  'put("key", 1)',
  'contains("key")',
  'keys()',
  'values()',
  'remove("key")',
] as const;

function sourceFor(version: number, kind: string, actual: string, call: string, forwarded: boolean, typed: boolean) {
  const annotation = typed ? `${kind} ` : '';
  return (
    prefix(version) +
    `read(${annotation}fresh) =>
    fresh.${call}
    1
${
  forwarded
    ? `relay(${annotation}inputValue) =>
    copied = inputValue
    read(copied)
`
    : ''
}plot(${forwarded ? 'relay' : 'read'}(${actual}), "value")`
  );
}

function expectValues(source: string, value: number) {
  expect(errors(source)).toEqual([]);
  const result = runCompatScript(source);
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  expect(getPlot(result, 'value').values).toEqual(compatibilityBars.map(() => value));
}

describe('written-call scalar collection receivers', () => {
  for (const version of [5, 6]) {
    for (const name of [
      'array',
      'map',
      'matrix',
      'line',
      'box',
      'label',
      'table',
      'linefill',
      'polyline',
      'ta',
      'math',
      'str',
      'color',
    ]) {
      it(`v${version} refuses the TK scalar get pair against ${name}`, () => {
        const source = `//@version=${version}\nindicator("TK attack")\nread(fresh) =>\n    fresh.get(1)\nplot(read(4))\n`;
        const renamed = source.replaceAll('fresh', name);
        expect(errors(renamed).length).toBeGreaterThan(0);
        expect(errors(source)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]));
      });
    }
    for (const { kind, actual } of scalars) {
      for (const call of calls) {
        for (const forwarded of [false, true]) {
          it(`v${version} ${kind} ${call} ${forwarded ? 'forwarded' : 'direct'} inherits receiver constraints`, () => {
            for (const typed of [false, true]) {
              expect(errors(sourceFor(version, kind, actual, call, forwarded, typed))).toEqual(
                expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
              );
            }
          });
        }
      }
    }
    for (const [family, declaration, call] of [
      ['array', 'array.new<int>(1, 4)', 'get(0)'],
      ['matrix', 'matrix.new<int>(1, 1, 4)', 'get(0, 0)'],
      ['map', 'map.new<string,int>()', 'get("key")'],
    ] as const) {
      for (const forwarded of [false, true]) {
        it(`v${version} preserves a ${forwarded ? 'forwarded' : 'direct'} ${family} receiver`, () => {
          expectValues(
            prefix(version) +
              `read(fresh) => fresh.${call}
${forwarded ? 'relay(xs) => read(xs)\n' : ''}xs = ${declaration}
${family === 'map' ? 'map.put(xs, "key", 4)\n' : ''}plot(${forwarded ? 'relay' : 'read'}(xs), "value")`,
            4,
          );
        });
      }
      it(`v${version} preserves ${family} namespace calls in a scalar-instantiated body`, () => {
        expectValues(
          prefix(version) +
            `read(fresh) =>
    xs = ${declaration}
    ${family === 'map' ? 'map.put(xs, "key", fresh)' : 'fresh'}
    ${family}.${call.replace('(', '(xs, ')}
plot(read(4), "value")`,
          4,
        );
      });
    }
    for (const { kind, actual } of scalars) {
      it(`v${version} preserves a custom ${kind} get method`, () => {
        expectValues(
          prefix(version) +
            `method get(${kind} self, int index) => 5
read(fresh) => fresh.get(1)
plot(read(${actual}), "value")`,
          5,
        );
      });
    }
    for (const [kind, actual, incompatible] of [
      ['bool', 'true', '"value"'],
      ['string', '"value"', 'true'],
      ['color', 'color.red', 'true'],
    ] as const) {
      const libraries = new Map([
        [
          'Author/Methods/1',
          parse(`//@version=${version}\nlibrary("Methods")\nexport method get(${kind} self, int index) => index + 4\n`),
        ],
      ]);
      const diagnostics = (value: string, index = '1') =>
        checkProgram(
          parse(
            prefix(version) +
              `import Author/Methods/1 as lib\nread(fresh) => fresh.get(${index})\nplot(read(${value}))`,
          ),
          { libraries },
        ).diagnostics.filter((entry) => entry.severity === 'error');
      // Imported primitive method execution has a separate inherited runtime defect; preserve admission here.
      it(`v${version} preserves imported custom ${kind} get admission`, () => {
        expect(diagnostics(actual)).toEqual([]);
      });
      it(`v${version} rejects incompatible imported custom ${kind} get receivers`, () => {
        expect(diagnostics(incompatible)).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
        );
      });
      it(`v${version} rejects incompatible imported custom ${kind} get arguments`, () => {
        expect(diagnostics(actual, '"index"')).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
        );
      });
    }
  }
});
