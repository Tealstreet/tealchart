import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Authority: https://www.tradingview.com/pine-script-reference/v6/.
// Core rules use the type-system manual linked by the type/int,float,bool entries.
// Ledger: type-qualifier-system-v1. No strategy/order semantics are involved.
function check(body: string) {
  return checkProgram(parse('//@version=6\nindicator("Documented conversion")\n' + body));
}

function expectType(body: string, type: object) {
  const result = check(body);
  expect(result.diagnostics).toEqual([]);
  expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toMatchObject(type);
}

describe('documented numeric inference and conversion', () => {
  // Reference type/int example infers i=14; type/float example infers f=3.14.
  // Manual linked by their remarks also distinguishes integral decimal/exponent
  // literals from integer literals. RED: NumericLiteral inference swapped int
  // and float kinds; each failed, then passed after restoration.
  for (const [literal, type] of [['7', 'int'], ['7.0', 'float'], ['7e0', 'float']] as const) {
    it(`${literal} infers ${type} [type/${type}]`, () => {
      expectType(`value = ${literal}`, { kind: type, qualifier: 'const' });
    });
  }

  // Reference type/float linked manual #type-casting: mixed operands produce
  // float in BOTH orders. RED: inferBinaryExpressionType chose int for mixed
  // numeric addition; failed for both orders and passed restored.
  it('mixing int and float operands promotes the expression to float', () => {
    for (const expression of ['7 + 0.25', '0.25 + 7']) {
      expectType(`value = ${expression}`, { kind: 'float', qualifier: 'const' });
    }
  });

  // Reference type/float linked manual #type-casting explicitly enumerates
  // variables, parameters and UDT fields. Each case uses integer literals
  // (not an integral float). RED: removed float<-int from isAssignableType
  // for variable/field cases; bypassed typeFromParameterArgument annotation for
  // the parameter case. All three failed, then passed restored. This rejects equality-only typing.
  for (const [name, body] of [
    ['variable', 'float value = 7'],
    ['parameter', 'consume(float x) => x\nvalue = consume(7)'],
    ['UDT field', 'type Holder\n    float amount\nvalue = Holder.new(7)'],
  ]) {
    it(`float ${name} accepts an int without an explicit cast [type/float]`, () => {
      const result = check(body);
      expect(result.diagnostics).toEqual([]);
      if (name === 'parameter') expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toMatchObject({ kind: 'float' });
    });
  }

  // Reference type/int linked manual #type-casting; function/int exists for
  // explicit conversion. RED: permitted int<-float in isAssignableType;
  // failed for fractional AND integral float sources, restored pass.
  it('float is never implicitly narrowed to int', () => {
    for (const literal of ['7.0', '-2.75']) {
      expect(check(`int value = ${literal}`).diagnostics).toEqual([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('Cannot assign float value to int') }),
      ]);
    }
  });

  // Reference type/bool permits true/false; linked manual #bool disallows
  // numeric auto-casts in v6. function/bool documents the explicit alternative.
  // RED: removed the legacy-version guard on numeric->bool acceptance; each
  // refused type failed, then passed restored. Rejects JS numeric truthiness.
  for (const literal of ['-7', '0.25']) {
    it(`v6 refuses implicit numeric bool assignment from ${literal} [type/bool]`, () => {
      expect(check(`bool value = ${literal}`).diagnostics).toEqual([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('Cannot assign') }),
      ]);
    });
  }
});

describe('documented missing and void declaration constraints', () => {
  // Reference variable/na and type/int,float,string,color remarks require a
  // type for na initialization. RED: disabled allowsUntypedNaDeclaration guard;
  // failed (no diagnostic), restored pass. Typed alternatives already have
  // runtime missing-value tests, so an unconditional refusal is not certified.
  it('untyped na initialization is refused in v6 [variable/na remarks]', () => {
    expect(check('value = na').diagnostics).toEqual([
      expect.objectContaining({ code: 'version-mismatch', message: expect.stringContaining('Untyped declarations initialized with na') }),
    ]);
  });

  // Reference function/line.delete returnedTypes=[void], linked type manual
  // #void: it cannot initialize a variable. RED: disabled declaration void
  // check; failed, restored pass. Both direct and UDF-return paths are checked.
  it('a void drawing deletion cannot become a variable value [function/line.delete]', () => {
    for (const body of ['value = line.delete(line(na))', 'remove() => line.delete(line(na))\nvalue = remove()']) {
      expect(check(body).diagnostics).toEqual([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringMatching(/^Cannot assign.*(returns no value|void value)/) }),
      ]);
    }
    expect(check('line.delete(line(na))').diagnostics).toEqual([]);
  });
});

describe('documented qualifier dependence', () => {
  // Reference type/series restrictions and function/ta.ema length allowedTypeIDs
  // simple/input/const int. Linked manual #series gives exactly this unchanged
  // result example. RED: maxQualifier returned undefined; failed, restored pass.
  it('a numerically constant series-dependent result remains series', () => {
    const result = check('value = bar_index * 0 + 3\nplot(ta.ema(close, value))');
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind: 'int', qualifier: 'series' });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining("series value to simple parameter 'length'") }),
    ]);
  });

  // Reference function/int and function/float series overloads; type/series
  // restriction. No bool qualifier assertion because its const overload's
  // numeric allowedTypeIDs conflict with the no-demotion manual rule.
  // RED: int/float call inference returned const qualifier; failed/pass.
  for (const cast of ['int(close)', 'float(bar_index)']) {
    it(`${cast} cannot demote series to simple [function/${cast.split('(')[0]}]`, () => {
      const result = check(`simple ${cast.startsWith('int') ? 'int' : 'float'} value = ${cast}`);
      expect(result.diagnostics).toEqual([
        expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('Cannot assign series value to simple') }),
      ]);
    });
  }

  // Reference keyword/var is one-time initialization; it is not a qualifier
  // downgrade. type/series linked manual #const explicitly distinguishes them.
  // RED: inferIdentifierType classified builtin close as const; failed/pass.
  it('var initialized from close remains series [keyword/var, variable/close]', () => {
    expectType('var value = close', { kind: 'float', qualifier: 'series' });
  });
});

// Enum nominal identity is documented by keyword/enum and its linked type
// manual. Identically titled fields in distinct enums remain distinct types.
// RED: isAssignableType ignored udt nominal names; refusal failed, restored pass.
it('distinct enum types do not become interchangeable because their field titles match [keyword/enum]', () => {
  const prefix = 'enum First\n    one = "Same"\nenum Second\n    one = "Same"\n';
  expect(check(prefix + 'First value = First.one').diagnostics).toEqual([]);
  expect(check(prefix + 'First value = Second.one').diagnostics).toEqual([
    expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('Cannot assign Second value to First') }),
  ]);
});
