import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

const program = (body: string) => `//@version=6
indicator("String qualifier consumers")
${body}`;

function checkRefusal(body: string, qualifier: string, kind: string) {
  const checked = checkProgram(parse(program(body)));
  const errors = checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  expect(errors).not.toEqual([]);
  expect(errors.map((error) => error.message).join(' ')).toContain(qualifier);
  const resultType = checked.symbols.find((symbol) => symbol.name === 'value')?.type;
  expect(resultType?.qualifier).toBe(qualifier);
  expect(resultType?.kind).toBe(kind);
}

function checkAdmission(body: string) {
  const checked = checkProgram(parse(program(body)));
  expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
}

describe('string result qualifier consumers', () => {
  for (const predicate of ['contains', 'startswith', 'endswith']) {
    for (const inputOperand of ['source', 'pattern']) {
      const source = inputOperand === 'source' ? 'input.string("abXab")' : '"abXab"';
      const pattern = inputOperand === 'pattern' ? 'input.string("ab")' : '"ab"';
      const value = `value = str.${predicate}(source=${source}, str=${pattern})`;
      it(`${predicate} with input ${inputOperand} refuses an input-bool consumer`, () => {
        checkRefusal(
          `${value}
consumer = input.bool(true, active=value)`,
          'simple',
          'bool',
        );
      });
      it(`${predicate} with input ${inputOperand} admits a simple-bool consumer`, () => {
        checkAdmission(`${value}
consume(simple bool sample) => sample ? 1 : 0
plot(consume(value))`);
      });
    }
  }

  for (const [name, expression] of [
    ['constant', 'str.format_time(0, "yyyy", "UTC")'],
    ['input time', 'str.format_time(input.int(0), "yyyy", "UTC")'],
    ['input format', 'str.format_time(0, input.string("yyyy"), "UTC")'],
  ]) {
    it(`format_time with ${name} arguments refuses an input-bool consumer`, () => {
      checkRefusal(
        `value = ${expression}
consumer = input.bool(true, active=value == "1970")`,
        'series',
        'string',
      );
    });
  }
  it('format_time refuses a simple-string consumer', () => {
    checkRefusal(
      `value = str.format_time(0, "yyyy", "UTC")
consume(simple string sample) => str.length(sample)
plot(consume(value))`,
      'series',
      'string',
    );
  });
  it('format_time refuses a constant plot title', () => {
    checkRefusal(
      `value = str.format_time(0, "yyyy", "UTC")
plot(close, title=value)`,
      'series',
      'string',
    );
  });

  for (const [name, expression] of [
    ['length', 'str.length(input.string("abc"))'],
    ['pos', 'str.pos(input.string("abc"), "b")'],
  ]) {
    it(`${name} refuses an input-int linewidth consumer`, () => {
      checkRefusal(
        `value = ${expression}
plot(close, linewidth=value)`,
        'simple',
        'int',
      );
    });
    it(`${name} admits a simple-int consumer`, () => {
      checkAdmission(`value = ${expression}
consume(simple int sample) => sample
plot(consume(value))`);
    });
  }

  for (const [name, expression] of [
    ['constant', 'str.match("abXab", "[a-z]+")'],
    ['input source', 'str.match(input.string("abXab"), "[a-z]+")'],
    ['input regex', 'str.match("abXab", input.string("[a-z]+"))'],
  ]) {
    it(`match with ${name} arguments refuses an input-bool consumer`, () => {
      checkRefusal(
        `value = ${expression}
consumer = input.bool(true, active=value == "ab")`,
        'simple',
        'string',
      );
    });
    it(`match with ${name} arguments admits a simple-string consumer`, () => {
      checkAdmission(`value = ${expression}
consume(simple string sample) => str.length(sample)
plot(consume(value))`);
    });
  }
  it('match refuses a constant plot title', () => {
    checkRefusal(
      `value = str.match("abc", "[a-z]+")
plot(close, title=value)`,
      'simple',
      'string',
    );
  });
  it('an input string admits input-active and simple-string consumers', () => {
    checkAdmission(`value = input.string("ab")
enabled = input.bool(true, active=value == "ab")
consume(simple string sample) => str.length(sample)
plot(consume(value))
plot(enabled ? 1 : 0)`);
  });
});
