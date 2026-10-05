import { describe, expect, it } from 'vitest';

import { parse } from './parser';

const captured = '//@version=5\nindicator("import/not_a_library")\n// Importing a script that has no `library()` declaration is an error.\nimport notlib as n\nplot(1)\n\n// Expected error:\n// error [not-a-library] 4:18: imported script `notlib` has no `library()` declaration\n';

describe('captured malformed import reserved as diagnostic', () => {
  it('matches the native v5 message and site', () => {
    let error: unknown;
    try {
      parse(captured);
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({
      name: 'TealscriptParseError',
      message: "'as' cannot be used as a variable or function name.",
      location: { start: { line: 4, column: 15 } },
    });
  });

  it('keeps a complete import alias intact', () => {
    const ast = parse('//@version=5\nindicator("control")\nimport a/b/1 as n\nplot(1)\n');
    expect(ast.body.find(node => node.type === 'ImportDeclaration')).toMatchObject({
      path: 'a/b/1',
      alias: { name: 'n' },
    });
  });

  it.each([
    'as = 1\nplot(as)',
    'as() => 1\nplot(as())',
    'f(float as) => as\nplot(f(close))',
    'type Holder\n    float as\nh = Holder.new(close)\nplot(h.as)',
    'as_value = 1\nplot(as_value)',
    'plot(1, "import notlib as n")\n// import notlib as n',
  ])('preserves prior parser admission for non-import control %s', source => {
    expect(() => parse('//@version=5\nindicator("control")\n' + source + '\n')).not.toThrow();
  });

  it('does not classify uncaptured v4 import syntax as a native reserved-name error', () => {
    expect(() => parse(captured.replace('//@version=5', '//@version=4'))).toThrow(/Expected/);
  });
});
