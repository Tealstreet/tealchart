import { describe, expect, it } from 'vitest';

import { parse } from './parser';
import { checkProgram } from './semantic/checker';

const holder = 'type Holder\n    int value\n';
// Native code authority: oracle rounds v58-v78; unavailable v5 codes stay unset.
const cases = [
  { code: 'CE10093', body: `${holder}read() =>\n    Holder box = Holder.new(1)\n    1\nplot(read())` },
  { code: 'CE10133', body: 'seed() => close\nread(value = seed()) => value\nplot(read())' },
  { code: 'CE10134', body: 'read(series float value = volume * 2) => value\nplot(1)' },
  { code: 'CE10150', body: 'read() => [1, 2]\nvar [a, b] = read()\nplot(a)' },
  { code: 'CE10156', body: '[a, b] = [1, 2]\nplot(a)' },
  {
    code: 'CE10153',
    body: `${holder}method read(Holder self) => self.value\nf(Holder box) =>\n    ignored = box.new(0, 2, 1, 1)\n    box.read()\nplot(f(Holder.new(1)))`,
  },
  { code: 'CE10165', body: 'read(box box) =>\n    box.get_top()\nplot(read(box.new(0, 2, 1, 1)))' },
  {
    code: 'CE10173',
    body: 'read(array<float> xs, array<int> ys) =>\n    copied = xs\n    copied := ys\n    array.size(copied)\nplot(read(array.new<float>(), array.new<int>()))',
  },
  {
    code: 'CE10182',
    body: 'float value = close\nmethod read(int self) => value\nmethod read(float self) => self\nplot(close.read())',
  },
  {
    code: 'CE10195',
    body: `${holder}method ema(Holder self, int length) => self.value + length\nread(Holder ta) => ta.ema(2)\nplot(read(Holder.new(1)))`,
  },
  { code: 'CE10236', body: `${holder}method read(Holder self) => 1\nplot(Holder.new(1).read())` },
  { code: 'CE10271', body: 'import test/NativeCodes/1 as lib\nplot((3.5).pick())' },
  { code: 'CE10271', body: 'import test/NativeCodes/1 as lib\nplot(lib.pickFunction(3.5))' },
  { code: 'CE10275', body: 'plot(timestamp("2020-01-01T00:00:00Z"))' },
];
function diagnostics(body: string, version = 6) {
  const source = `//@version=${version}\nindicator("Diagnostic code")\n${body}`;
  try {
    const library = parse(
      `//@version=${version}\nlibrary("NativeCodes")\nmethod pick(float self) => self\npickFunction(float value) => value\nexport forward(float value) => value.pick()`,
    );
    return checkProgram(parse(source), { libraries: new Map([['test/NativeCodes/1', library]]) }).diagnostics;
  } catch (error) {
    return [error as { nativeCode?: string }];
  }
}
describe('witnessed Pine v6 diagnostic code transport', () => {
  it.each(cases)('$code: $body', ({ code, body }) => {
    expect(diagnostics(body).some((diagnostic) => diagnostic.nativeCode === code)).toBe(true);
  });
  it.each(cases)('v5 keeps unavailable code unset: $code: $body', ({ body }) => {
    expect(diagnostics(body, 5).every((diagnostic) => diagnostic.nativeCode === undefined)).toBe(true);
  });
  it.each([5, undefined])('keeps imported v6 body codes unset for consumer version %s', (version) => {
    const libraries = new Map([
      ['test/A/1', parse('//@version=6\nlibrary("A")\nimport test/B/1 as b\nexport forward() => (3.5).hidden()')],
      ['test/B/1', parse('//@version=6\nlibrary("B")\nmethod hidden(float self) => self\nexport anchor(float x) => x.hidden()')],
    ]);
    const directive = version === undefined ? '' : `//@version=${version}\n`;
    const result = checkProgram(parse(`${directive}indicator("Consumer")\nimport test/A/1 as a\nplot(a.forward())`), { libraries });
    expect(result.diagnostics.filter(({ code }) => code === 'private-library-method')).toEqual([{
      code: 'private-library-method',
      message: "Could not find method or method reference 'float.hidden'",
      severity: 'error',
      line: 4,
      column: 26,
    }]);
    expect(result.diagnostics.every((diagnostic) => !Object.hasOwn(diagnostic, 'nativeCode'))).toBe(true);
  });
  it('does not tag a program without an explicit Pine v6 directive', () => {
    const result = checkProgram(
      parse('indicator("Unknown version")\nseed() => close\nread(value = seed()) => value\nplot(read())'),
    );
    expect(result.diagnostics.every((diagnostic) => diagnostic.nativeCode === undefined)).toBe(true);
  });
  it.each([
    '[a, b, c] = [1, 2, 3]\nplot(a)',
    'read() => [1, 2, 3]\nvar [a, b, c] = read()\nplot(a)',
    'read(value = ta.ema(close, 2)) => value\nplot(read())',
    'read(series float value = close * 2) => value\nplot(1)',
    'float value = close\nread(int self) => value\nread(float self) => self\nplot(read(close))',
    'plot(timestamp("not a date"))',
    'unknownFunction()\nplot(1)',
    'import test/NativeCodes/1 as lib\nvalue = 3.5\nplot(value.pick())',
    'import test/NativeCodes/1 as lib\nvalue = 3.5\nplot(lib.pickFunction(value))',
  ])('does not tag an unwitnessed refusal shape: %s', (body) => {
    expect(diagnostics(body).every((diagnostic) => diagnostic.nativeCode === undefined)).toBe(true);
  });
});
