import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const captured = [
  {
    name: 'corpus-gaps43-duplicate-method-exact-v5.pine',
    source:
      '//@version=5\nindicator("Unsupported duplicate user method")\ntype Point\n    float x\n\nmethod shift(Point p) => p.x\nmethod shift(Point p) => p.x + 1\nplot(close)\n',
    sha256: '7ba22e4d2286acb6d0c7a51ca15c0b0c94d0549f4c9977634bcfc31e48c04937',
  },
  {
    name: 'drawing-method-identical-v5-invoked-v1.pine',
    source:
      '//@version=5\nindicator("Identical user method invocation probe")\ntype Point\n    float x\nmethod shift(Point p) => p.x\nmethod shift(Point p) => p.x + 1\np = Point.new(10)\nplot(p.shift(), title="SELECTED_BODY")\nplot(time, title="INPUT_TIME")\n',
    sha256: 'd4ecb67b99abd0fcc859f3b5133f2ef6f33e7755f827bd08fcbda8f9f55a21cd',
  },
  {
    name: 'drawing-method-identical-v56-1376-exact-v1.pine',
    source:
      '//@version=5\nindicator("Unsupported duplicate user method")\ntype Point\n    float x\n\nmethod shift(Point p) => p.x\nmethod shift(Point p) => p.x + 1\nplot(close)\n',
    sha256: '7ba22e4d2286acb6d0c7a51ca15c0b0c94d0549f4c9977634bcfc31e48c04937',
  },
];
const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
describe('captured v5 local method signatures', () => {
  it.each(captured)('refuses captured duplicate signature $name', ({ source, sha256 }) => {
    expect(createHash('sha256').update(source).digest('hex')).toBe(sha256);
    expect(errors(source)).toContainEqual(expect.objectContaining({ code: 'invalid-overload' }));
  });
  it('preserves native distinct-signature admission', () => {
    expect(
      errors(
        '//@version=5\nindicator("Corpus distinct method signature control")\ntype Point\n    float x\nmethod shift(Point p) => p.x\nmethod shift(Point p, float delta) => p.x + delta\np = Point.new(close)\nplot(p.shift(), "ONE", display=display.data_window)\nplot(p.shift(1.0), "TWO", display=display.data_window)\n',
      ),
    ).toEqual([]);
  });
  it('preserves a local override of a builtin method', () => {
    expect(
      errors(`//@version=5
indicator("Builtin override")
method get_x(label id) => 99
id = label.new(bar_index, close)
plot(id.get_x())`),
    ).toEqual([]);
  });
  it('keeps uncaptured v6 duplicate policy separate', () => {
    expect(errors(captured[0].source.replace('//@version=5', '//@version=6'))).toEqual([]);
  });
});
