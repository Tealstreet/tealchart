import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

function check(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Collection ranks 241-280")\n${body}`)).diagnostics;
}

function values(body: string) {
  expect(check(body)).toEqual([]);
  const result = runCompatScript(`//@version=6\nindicator("Collection ranks 241-280")\n${body}`);
  expect(result.errors).toEqual([]);
  return getPlot(result, 'result').values;
}

describe('collection documented ranks 241-280', () => {
  for (const type of ['int', 'float']) {
    const elements = (numbers: number[]) => numbers.map(number => type === 'float' ? `${number}.0` : String(number)).join(', ');
    for (const method of [false, true]) {
      const maxCall = method ? 'a.max' : 'array.max';
      const sumCall = method ? 'a.sum()' : 'array.sum(a)';
      const firstCall = method ? 'a.first()' : 'array.first(a)';
      const indexCall = method ? 'a.indexof' : 'array.indexof';
      const prefix = method ? '' : 'a, ';

      it(`${type} ${maxCall} follows the worked third-highest example`, () => {
        expect(values(`array<${type}> a = array.from(${elements([5, -2, 0, 9, 1])})\nplot(${maxCall}(${prefix}2), title="result")`)).toEqual(Array(12).fill(1));
      });

      it(`${type} ${maxCall} returns na for an empty array`, () => {
        expect(values(`a = array.new<${type}>()\nplot(${maxCall}(${prefix}0), title="result")`)).toEqual(Array(12).fill(null));
      });

      it(`${type} ${maxCall} admits input and series integer selectors`, () => {
        expect(values(`a = array.new<${type}>()\na.push(5)\na.push(9)\na.push(1)\nn = input.int(1)\nplot(${maxCall}(${prefix}n + bar_index % 2), title="result")`)).toEqual([5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1]);
      });

      it(`${type} ${maxCall} admits a simple integer selector`, () => {
        expect(values(`a = array.new<${type}>()\na.push(5)\na.push(9)\na.push(1)\nsimple int n = 1\nplot(${maxCall}(${prefix}n), title="result")`)).toEqual(Array(12).fill(5));
      });

      it(`${type} ${sumCall} sums signed elements`, () => {
        expect(values(`array<${type}> a = array.from(${elements([7, -3, 2])})\nplot(${sumCall}, title="result")`)).toEqual(Array(12).fill(6));
      });

      it(`${type} ${sumCall} returns na for an empty array`, () => {
        expect(values(`a = array.new<${type}>()\nplot(${sumCall}, title="result")`)).toEqual(Array(12).fill(null));
      });

      it(`${type} ${firstCall} returns the first rather than last element`, () => {
        expect(values(`array<${type}> a = array.from(${elements([7, -3, 2])})\nplot(${firstCall}, title="result")`)).toEqual(Array(12).fill(7));
      });

      it(`${type} ${indexCall} selects the first duplicate and returns -1 when absent`, () => {
        expect(values(`array<${type}> a = array.from(${elements([7, -3, 7])})\nplot(${indexCall}(${prefix}bar_index % 2 == 0 ? 7 : 29), title="result")`)).toEqual([0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1]);
      });

      it(`${type} ${firstCall} errors on an empty array`, () => {
        const body = `a = array.new<${type}>()\nplot(${firstCall}, title="result")`;
        expect(check(body)).toEqual([]);
        const result = runCompatScript(`//@version=6\nindicator("empty first")\n${body}`);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some((error) => /empty|bounds|size.*0/i.test(error.message))).toBe(true);
      });
    }
  }

  for (const member of ['max', 'sum']) {
    for (const type of ['bool', 'string']) {
      it(`array.${member} refuses ${type} arrays`, () => {
        expect(check(`a = array.new<${type}>()\nx = array.${member}(a${member === 'max' ? ', 0' : ''})`).length).toBeGreaterThan(0);
      });
    }
  }

  for (const selector of ['1.5', 'true', '"bad"']) {
    it(`array.max refuses noninteger selector ${selector}`, () => {
      expect(check(`a = array.from(7, 3)\nx = array.max(a, ${selector})`).length).toBeGreaterThan(0);
    });
  }

  for (const type of ['int', 'float']) {
    it(`array.max returns series ${type}, rather than const ${type}`, () => {
      expect(check(`a = array.new<${type}>(2, 7)\nconst ${type} x = array.max(a, 0)`).length).toBeGreaterThan(0);
    });
  }

  for (const method of [false, true]) {
    it(`string first/indexof preserve element type and first-match semantics, method=${method}`, () => {
      const first = method ? 'a.first()' : 'array.first(a)';
      const index = method ? 'a.indexof("red")' : 'array.indexof(a, "red")';
      expect(values(`a = array.from("red", "blue", "red")\nstring head = ${first}\nplot(head == "red" ? ${index} : 99, title="result")`)).toEqual(Array(12).fill(0));
    });

    it(`bool first/indexof preserve element type, method=${method}`, () => {
      const first = method ? 'a.first()' : 'array.first(a)';
      const index = method ? 'a.indexof(false)' : 'array.indexof(a, false)';
      expect(values(`a = array.from(true, false, true)\nbool head = ${first}\nplot(head ? ${index} : 99, title="result")`)).toEqual(Array(12).fill(1));
    });
  }

  for (const member of ['max', 'sum', 'first', 'indexof']) {
    it(`array.${member} requires its array argument`, () => {
      expect(check(`x = array.${member}()`).length).toBeGreaterThan(0);
    });
  }

  it('array.indexof requires the searched value', () => {
    expect(check('a = array.from(7, 3)\nx = array.indexof(a)').length).toBeGreaterThan(0);
  });

  it('array.indexof refuses a searched value of the wrong element type', () => {
    expect(check('a = array.from(7, 3)\nx = array.indexof(a, "bad")').length).toBeGreaterThan(0);
  });

  it('receiver indexof refuses a searched value of the wrong element type', () => {
    expect(check('a = array.from(7, 3)\nx = a.indexof("bad")').length).toBeGreaterThan(0);
  });

  for (const member of ['max', 'sum']) {
    it(`receiver ${member} refuses a nonnumeric array`, () => {
      expect(check(`a = array.from("a", "b")\nx = a.${member}(${member === 'max' ? '0' : ''})`).length).toBeGreaterThan(0);
    });
  }

  it('numeric helper checker preserves custom max overload admission', () => {
    expect(check('method max(array<int> id, string selector) => 7\na = array.from(9, 3)\nplot(a.max("custom"), title="result")')).toEqual([]);
  });

  for (const method of [false, true]) {
    const call = (value: string) => method ? `a.indexof(${value})` : `array.indexof(a, ${value})`;

    it(`indexof admits integer search values in float arrays, method=${method}`, () => {
      expect(values(`a = array.from(7.0, 3.0, 7.0)\nplot(${call('7')}, title="result")`)).toEqual(Array(12).fill(0));
    });

    it(`indexof refuses float search values in integer arrays, method=${method}`, () => {
      expect(check(`a = array.from(7, 3)\nx = ${call('7.5')}`).some(diagnostic => diagnostic.code === 'type-mismatch')).toBe(true);
    });

    it(`indexof refuses bool search values in integer arrays, method=${method}`, () => {
      expect(check(`a = array.from(7, 3)\nx = ${call('true')}`).some(diagnostic => diagnostic.code === 'type-mismatch')).toBe(true);
    });
  }

  it('first and indexof checker preserve user-defined method qualifiers and parameter kinds', () => {
    expect(check('method first(array<int> id) => 7\nmethod indexof(array<int> id, string value) => 2\na = array.from(9, 3)\nconst int head = a.first()\nconst int index = a.indexof("custom")')).toEqual([]);
  });

  it('array.max and indexof honor named argument positions', () => {
    expect(values('a = array.from(7, 3, 9)\nx = array.max(nth=1, id=a)\ny = array.indexof(value=9, id=a)\nplot(x + y, title="result")')).toEqual(Array(12).fill(9));
  });

  it('array.first reproduces the official worked example', () => {
    expect(values('arr = array.new_int(3, 10)\nplot(array.first(arr), title="result")')).toEqual(Array(12).fill(10));
  });

  it('array.indexof reproduces the official worked example', () => {
    expect(values('a = array.new_float(5, high)\nplot(array.indexof(a, high), title="result")')).toEqual(Array(12).fill(0));
  });

  for (const member of ['first', 'indexof']) {
    it(`array.${member} retains a series return qualifier`, () => {
      const args = member === 'indexof' ? ', 7' : '';
      expect(check(`a = array.from(7, 3)\nconst int x = array.${member}(a${args})`).length).toBeGreaterThan(0);
    });
    it(`receiver ${member} retains a series return qualifier`, () => {
      const args = member === 'indexof' ? '7' : '';
      expect(check(`a = array.from(7, 3)\nconst int x = a.${member}(${args})`).length).toBeGreaterThan(0);
    });
  }

  it('receiver max retains a series return qualifier', () => {
    expect(check('a = array.from(7, 3)\nconst int x = a.max(0)').length).toBeGreaterThan(0);
  });
});
