import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Methods manual permits overriding built-in and user-defined methods.
// Native v5 captures refuse identical local signatures; v6 remains unobserved.
const methodsReference = 'https://www.tradingview.com/pine-script-docs/language/methods/#method-overloading';
const source = (body: string, version = 5) => `//@version=${version}\nindicator("User method admission")\n${body}`;
const errors = (script: string) =>
  checkProgram(parse(script)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
function values(body: string, expected: number[], version = 5): void {
  const script = source(body, version);
  expect(errors(script), methodsReference).toEqual([]);
  const result = runCompatScript(script, { bars: compatibilityBars.slice(0, 2) });
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'result').values).toEqual(expected);
}

describe('User methods precede matching builtin casts and methods', () => {
  for (const version of [5, 6]) {
    for (const name of ['label', 'line', 'box', 'table', 'linefill']) {
      it(`v${version} string.${name} retains user binding and return type`, () => {
        values(
          `method ${name}(string direction, int state, float price) => price + state
float result = "bull".${name}(price=close, state=1)
plot(result, title="result")`,
          [103, 106],
          version,
        );
      });
    }
    it(`v${version} drawing getter override retains string return`, () => {
      values(
        `method get_x(label id) => "user"
id = label.new(bar_index, close)
string message = id.get_x()
plot(str.length(message), title="result")`,
        [4, 4],
        version,
      );
    });
    it(`v${version} drawing setter overload retains float parameter`, () => {
      values(
        `method set_x(label id, float index) => index + 1
id = label.new(bar_index, close)
float result = id.set_x(2.5)
plot(result, title="result")`,
        [3.5, 3.5],
        version,
      );
    });
  }
  it('builtin-name method overload retains tuple element types', () => {
    values(
      `method get_x(label id) => [1, "user"]
id = label.new(bar_index, close)
[number, message] = id.get_x()
plot(number + str.length(message), title="result")`,
      [5, 5],
    );
  });
  it('the original string label method creates the requested drawing', () => {
    values(
      `method label(string direction, int state, float price) => label.new(bar_index, price + state)
id = "bull".label(1, close)
plot(label.get_y(id), title="result")`,
      [103, 106],
    );
  });
  it('distinct user-defined overloads keep receiver and argument binding', () => {
    values(
      `method offset(float price) => price + 1
method offset(float price, int distance) => price + distance
plot(close.offset() + close.offset(distance=3), title="result")`,
      [208, 214],
    );
  });
  it('identical v5 user-method declarations are refused by native signature policy', () => {
    const script = source(`type Point
    float x
method shift(Point p) => p.x
method shift(Point p) => p.x + 1
plot(close)`);
    expect(errors(script)).toContainEqual(expect.objectContaining({ code: 'invalid-overload' }));
  });
  it('ordinary UDF identical overload refusal is preserved', () => {
    expect(
      errors(
        source(`shift(float p) => p
shift(float p) => p + 1
plot(close)`),
      ).some((diagnostic) => diagnostic.code === 'invalid-overload'),
    ).toBe(true);
  });
  it('nonmatching custom receiver keeps the builtin label getter', () => {
    values(
      `method get_x(string message) => "user"
id = label.new(bar_index + 7, close)
plot(id.get_x(), title="result")`,
      [7, 8],
    );
  });
  it('integer coordinates and explicit casts remain admitted', () => {
    values(
      `label.new(bar_index + int((1 + 2) / 2), close)
b = box.new(bar_index, high, bar_index + int(math.max(input.int(6) * 2 / 3, 1)), low)
p = chart.point.from_index(bar_index + int(input.int(50) / 2 - 1), low)
plot(p.index, title="result")`,
      [24, 25],
      6,
    );
  });
  it('the published v5 MA Sabres default-length point index remains admitted', () => {
    // https://www.tradingview.com/script/viwa6CR8-MA-Sabres-LuxAlgo/
    values(
      `p = chart.point.from_index(bar_index + (input.int(50) / 2 - 1), low)
plot(p.index, title="result")`,
      [24, 25],
      5,
    );
  });
  // Native-backed d79356eef1; drawing-division-w8-b00b-v1/REPORT-v1.md.
  it.each([
    ['v6 label x', 6, 'label.new(bar_index + (1 + 2) / 2, close)', 'label.new x'],
    [
      'v6 box right',
      6,
      'box.new(bar_index, high, bar_index + math.max(input.int(6) * 2 / 3, 1), low)',
      'box.new right',
    ],
    [
      'v5 point index',
      5,
      'chart.point.from_index(bar_index + (input.int(50) / 2 - 1), low)',
      'chart.point.from_index index',
    ],
  ])('%s admits integer-derived division coordinates', (_name, version, body) => {
    expect(errors(source(body as string, version as number))).toEqual([]);
  });
});
