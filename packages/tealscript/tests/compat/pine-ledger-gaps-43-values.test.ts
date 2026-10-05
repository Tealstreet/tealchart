import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const run = (body: string) => {
  const result = runCompatScript(`//@version=6\nindicator("Gaps43 values")\n${body}\n`, {
    bars: Array.from({ length: 4 }, (_, i) => ({
      time: 1700000000000 + i * 60000,
      open: 100,
      high: 102,
      low: 99,
      close: 101,
      volume: 100,
    })),
  });
  expect(result.errors).toEqual([]);
  return result;
};
const values = (body: string) => getPlot(run(body), 'VALUE').values;

describe('ledger gaps43 language values', () => {
  it('1681 loop body and counter names do not escape', () => {
    for (const name of ['hidden', 'i']) {
      const result = checkProgram(
        parse(`//@version=6\nindicator("Scope")\nfor i = 0 to 1\n    hidden = i\nplot(${name})`),
      );
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({ code: 'unknown-identifier', severity: 'error' }),
      );
    }
  });
  it('1682 zero-iteration loops return na and skip effects', () => {
    expect(
      values('int count=0\nx=while false\n    count += 1\n    17\nplot(na(x) and count == 0 ? 1 : 0,title="VALUE")'),
    ).toEqual([1, 1, 1, 1]);
  });
  it('1684 tuple returns retain independent members', () => {
    const result = run('f(int x) => [x+2,x*3]\n[a,b]=f(bar_index)\nplot(a,title="A")\nplot(b,title="B")');
    expect(getPlot(result, 'A').values).toEqual([2, 3, 4, 5]);
    expect(getPlot(result, 'B').values).toEqual([0, 3, 6, 9]);
  });
  it('1686 required arity chooses the distinct overload', () => {
    const result = run('f(int x)=>x+1\nf(int x,int y)=>x+y\nplot(f(2),title="A")\nplot(f(2,5),title="B")');
    expect(getPlot(result, 'A').values).toEqual([3, 3, 3, 3]);
    expect(getPlot(result, 'B').values).toEqual([7, 7, 7, 7]);
  });
  it('1693 global and parameter references allow object mutation', () => {
    expect(
      values(
        'var a=array.new<int>(1,0)\nf(array<int> x)=>\n    array.set(x,0,array.get(x,0)+1)\n    array.get(x,0)\nplot(f(a),title="VALUE")',
      ),
    ).toEqual([1, 2, 3, 4]);
  });
  it('1697 and1698 field access/reassignment preserve other fields', () => {
    expect(
      values('type State\n    int x\n    int y\ns=State.new(7,13)\ns.x := 11\nplot(s.x*100+s.y,title="VALUE")'),
    ).toEqual([1113, 1113, 1113, 1113]);
  });
  it('1699 var applies persistence to object fields', () => {
    expect(values('type State\n    int x=0\nvar s=State.new()\ns.x += 1\nplot(s.x,title="VALUE")')).toEqual([
      1, 2, 3, 4,
    ]);
  });
  it('1701 history selects the object before accessing its field', () => {
    expect(values('type State\n    int x\ns=State.new(bar_index+7)\nplot((s[1]).x,title="VALUE")')).toEqual([
      null,
      7,
      8,
      9,
    ]);
  });
  it('1702 array get/set accesses elements without replacing the reference', () => {
    expect(
      values('a=array.from(3,7)\narray.set(a,1,11)\nplot(array.get(a,0)*100+array.get(a,1),title="VALUE")'),
    ).toEqual([311, 311, 311, 311]);
  });
  it.each(['int', 'float'])('1704 matrix %s template preserves initialized elements', (type) => {
    expect(values(`matrix<${type}> m=matrix.new<${type}>(1,2,7)\nplot(matrix.get(m,0,1),title="VALUE")`)).toEqual([
      7, 7, 7, 7,
    ]);
  });
  it('1705 input qualifier retains user supplied value', () => {
    const source =
      '//@version=6\nindicator("Input qualifier")\ninput int x=input.int(7,title="Choice")\nplot(x,title="VALUE")';
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source, { inputs: new Map([['input_0', 11]]) });
    expect(getPlot(result, 'VALUE').values).toEqual(Array(12).fill(11));
  });
  it.each([
    ['1706 integer', '42', 42],
    ['1707 float', '1.25e2', 125],
    ['1708 bool', 'true ? 1 : 0', 1],
    ['1709 na', 'na(float(na)) ? 1 : 0', 1],
  ])('%s literal', (_, expression, value) => {
    expect(values(`plot(${expression},title="VALUE")`)).toEqual(Array(4).fill(value));
  });
  it('1710 RGBA literal preserves all four channels', () => {
    const result = run(
      'color c=#12345678\nplot(color.r(c),title="R")\nplot(color.g(c),title="G")\nplot(color.b(c),title="B")\nplot(color.t(c),title="T")',
    );
    expect(getPlot(result, 'R').values).toEqual([18, 18, 18, 18]);
    expect(getPlot(result, 'G').values).toEqual([52, 52, 52, 52]);
    expect(getPlot(result, 'B').values).toEqual([86, 86, 86, 86]);
    // Exact rounding of color.t() is outside this literal decoding clause.
    expect(getPlot(result, 'T').values.every((v) => v !== null && v >= 52 && v <= 54)).toBe(true);
  });
  it('1711 escape sequences preserve exact string value', () => {
    const ast = parse('//@version=6\nindicator("Escapes")\nstring x="a\\nb\\tc\\\\d\\\"e"\nplot(1)');
    const declaration = ast.body.find((s) => s.type === 'VariableDeclaration');
    expect(
      declaration && declaration.type === 'VariableDeclaration' && declaration.init.type === 'StringLiteral'
        ? declaration.init.value
        : undefined,
    ).toBe('a\nb\tc\\d"e');
  });
  it('1712 triple double quoted strings retain newlines', () => {
    expect(values('string x="""a\nb"""\nplot(x == "a\\nb" ? 1 : 0,title="VALUE")')).toEqual([1, 1, 1, 1]);
  });
  it('1713 multiline leading/trailing whitespace is literal', () => {
    expect(values('string x="""a\n  b\n"""\nplot(x == "a\\n  b\\n" ? 1 : 0,title="VALUE")')).toEqual([1, 1, 1, 1]);
  });
  it('1714 exported functions require declared parameter types', () => {
    expect(checkProgram(parse('//@version=6\nlibrary("Typed")\nexport f(x)=>x')).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'library-export', severity: 'error' }),
    );
  });
  it('1715 exported functions admit unreassigned var constants and refuse reassigned globals', () => {
    // The const section explicitly permits var declarations; reassignment strengthens the qualifier.
    // https://www.tradingview.com/pine-script-docs/language/type-system/#const
    const script = (prefix: string, reassignment = '') =>
      `//@version=6\nlibrary("Globals")\n${prefix} int x=7\n${reassignment}\nexport f(int y)=>x+y`;
    expect(checkProgram(parse(script('var'))).diagnostics).toEqual([]);
    expect(checkProgram(parse(script('const'))).diagnostics).toEqual([]);
    expect(checkProgram(parse(script('var', 'x := 8'))).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'library-export', severity: 'error' }),
    );
  });
});
