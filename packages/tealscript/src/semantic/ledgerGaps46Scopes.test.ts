import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

function errors(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Scope contracts")\n${body}\n`)).diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
}

describe('ledger name and function scope contracts', () => {
  it.each([
    ['root', 'prior = close\nfloat close = open\nplot(prior)'],
    ['conditional', 'if bar_index > 0\n    prior = close\nfloat close = open\nplot(close)'],
    ['function', 'readPrice() => close\nfloat close = open\nplot(close)'],
    [
      'local declaration',
      'prior = close\nif bar_index > 0\n    float close = open\n    plotValue = close\nplot(prior)',
    ],
  ])('1801 refuses builtin use before a %s shadow declaration', (_, body) => {
    expect(errors(body)).toContainEqual(
      expect.objectContaining({
        code: 'invalid-builtin-shadow',
        message: expect.stringContaining('close'),
      }),
    );
  });

  it('1801 permits shadowing before any builtin use, followed by user-value reads', () => {
    expect(errors('float close = open\nplot(close)')).toEqual([]);
  });

  it('1801 does not confuse a UDF parameter with a builtin read', () => {
    expect(errors('readPrice(float close) => close\nfloat close = open\nplot(readPrice(close))')).toEqual([]);
  });

  it('1801 also checks a tuple binding after a builtin read', () => {
    expect(
      errors('prior = close\nmakePair() => [1, 2]\n[close, other] = makePair()\nplot(prior + other)'),
    ).toContainEqual(expect.objectContaining({ code: 'invalid-builtin-shadow' }));
  });

  it('1801 distinguishes earlier user-variable reads from a builtin read', () => {
    expect(
      errors(
        'float close = open\nprior = close\nif bar_index > 0\n    float close = high\n    value = close\nplot(prior)',
      ),
    ).toEqual([]);
  });

  it.each(['barstate', 'syminfo', 'math', 'ta'])('1803 refuses a UDT variable named %s', (name) => {
    expect(errors(`type Holder\n    int value = 1\nHolder ${name} = Holder.new()\nplot(${name}.value)`)).toContainEqual(
      expect.objectContaining({ code: 'namespace-obscuring', message: expect.stringContaining(name) }),
    );
  });

  it('1803 also refuses an inferred UDT variable obscuring a namespace', () => {
    expect(errors('type Holder\n    int value = 1\nsyminfo = Holder.new()\nplot(syminfo.value)')).toContainEqual(
      expect.objectContaining({ code: 'namespace-obscuring', message: expect.stringContaining('syminfo') }),
    );
  });

  it('1802 retains namespaces beside same-named scalar variables', () => {
    expect(errors('barstate = 7\nsyminfo = 9\nmath = 11\nplot(barstate + syminfo + math.abs(math))')).toEqual([]);
  });

  it('1803 accepts an ordinary UDT name and field', () => {
    expect(errors('type Holder\n    int value = 1\nHolder holder = Holder.new()\nplot(holder.value)')).toEqual([]);
  });

  it('1803 also checks a UDT returned into a tuple binding', () => {
    expect(
      errors(
        'type Holder\n    int value = 1\nmakePair() => [Holder.new(), 2]\n[math, other] = makePair()\nplot(other)',
      ),
    ).toContainEqual(expect.objectContaining({ code: 'namespace-obscuring' }));
  });

  it('1803 retains a same-named enum value beside a namespace', () => {
    expect(errors('enum Choice\n    first\nmath = Choice.first\nplot(math.abs(-1))')).toEqual([]);
  });

  it('1807 refuses a global declared after the function definition', () => {
    expect(errors('readLater() => later\nlater = 7\nplot(readLater())')).toContainEqual(
      expect.objectContaining({ code: 'unknown-identifier', message: expect.stringContaining('later') }),
    );
  });

  it('1807 accepts global reads after the global declaration', () => {
    expect(errors('earlier = 7\nreadEarlier() => earlier\nplot(readEarlier())')).toEqual([]);
  });

  for (const operator of [':=', '+=', '-=', '*=', '/=', '%='] as const) {
    it(`1808 refuses global ${operator} from a function`, () => {
      expect(
        errors(`var int total = 1\nchange() =>\n    total ${operator} 2\n    total\nplot(change())`),
      ).toContainEqual(
        expect.objectContaining({ code: 'global-variable-reassignment', message: expect.stringContaining('total') }),
      );
    });

    it(`1809 refuses parameter ${operator} from a function`, () => {
      expect(errors(`change(int value) =>\n    value ${operator} 2\n    value\nplot(change(1))`)).toContainEqual(
        expect.objectContaining({ code: 'parameter-reassignment', message: expect.stringContaining('value') }),
      );
    });
  }

  it('1808 follows the global binding through a nested function block', () => {
    expect(
      errors('var int total = 1\nchange() =>\n    if bar_index > 0\n        total += 2\n    total\nplot(change())'),
    ).toContainEqual(expect.objectContaining({ code: 'global-variable-reassignment' }));
  });

  it('1809 follows the parameter binding through a nested function block', () => {
    expect(
      errors('change(int value) =>\n    if bar_index > 0\n        value += 2\n    value\nplot(change(1))'),
    ).toContainEqual(expect.objectContaining({ code: 'parameter-reassignment' }));
  });

  it('1808 refuses replacing a global from a method', () => {
    expect(
      errors(
        'var int total = 1\nmethod change(array<int> values) =>\n    total := 2\n    array.size(values)\nvalues = array.new<int>()\nplot(values.change())',
      ),
    ).toContainEqual(expect.objectContaining({ code: 'global-variable-reassignment' }));
  });

  it('1809 refuses replacing a method receiver ID', () => {
    expect(
      errors(
        'method change(array<int> values) =>\n    values := array.new<int>()\n    array.size(values)\nvalues = array.new<int>()\nplot(values.change())',
      ),
    ).toContainEqual(expect.objectContaining({ code: 'parameter-reassignment' }));
  });

  it('1809 refuses replacing a reference parameter but permits its contents to change', () => {
    expect(
      errors(
        'change(array<int> values) =>\n    values := array.new<int>()\n    array.size(values)\nplot(change(array.new<int>()))',
      ),
    ).toContainEqual(expect.objectContaining({ code: 'parameter-reassignment' }));
    expect(
      errors(
        'change(array<int> values) =>\n    array.push(values, 2)\n    array.size(values)\nplot(change(array.new<int>()))',
      ),
    ).toEqual([]);
  });

  it('1808 permits replacing an outer variable in a root conditional', () => {
    expect(errors('var int total = 1\nif bar_index > 0\n    total += 2\nplot(total)')).toEqual([]);
  });

  it('1808 permits a function-local shadow and later reassignment', () => {
    expect(
      errors(
        'var int total = 1\nchange() =>\n    int total = 5\n    total += 2\n    total\nplot(change())\nplot(total)',
      ),
    ).toEqual([]);
  });

  it('1809 permits a block-local shadow of a parameter', () => {
    expect(
      errors(
        'change(int value) =>\n    if bar_index > 0\n        int value = 5\n        value += 2\n    value\nplot(change(1))',
      ),
    ).toEqual([]);
  });

  it('1810 permits global UDT field and array content mutation from a function', () => {
    expect(
      errors(
        'type Holder\n    int value = 1\nvar holder = Holder.new()\nvar values = array.new<int>()\nchange() =>\n    holder.value += 2\n    array.push(values, holder.value)\n    holder.value\nplot(change())',
      ),
    ).toEqual([]);
  });

});
