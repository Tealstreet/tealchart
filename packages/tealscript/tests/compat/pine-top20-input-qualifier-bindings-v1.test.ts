import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const slots = ['title', 'tooltip', 'inline', 'group', 'confirm', 'active'] as const;
const qualifiers = ['const', 'input', 'simple', 'series'] as const;
const overloads = [
  {
    name: 'int range',
    callee: 'input.int',
    firstRank: 57,
    named: '1, minval=0, maxval=2, step=1',
    parameters: [
      'defval',
      'title',
      'minval',
      'maxval',
      'step',
      'tooltip',
      'inline',
      'group',
      'confirm',
      'display',
      'active',
    ],
    defaults: ['1', '"Title"', '0', '2', '1', '"Tip"', '"Row"', '"Group"', 'false', 'display.all', 'true'],
  },
  {
    name: 'int options',
    callee: 'input.int',
    firstRank: 63,
    named: '1, options=[1, 2]',
    parameters: ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
    defaults: ['1', '"Title"', '[1, 2]', '"Tip"', '"Row"', '"Group"', 'false', 'display.all', 'true'],
  },
  {
    name: 'color',
    callee: 'input.color',
    firstRank: 272,
    named: 'color.red',
    parameters: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
    defaults: ['color.red', '"Title"', '"Tip"', '"Row"', '"Group"', 'false', 'display.none', 'true'],
  },
] as const;

function setup(slot: string, qualifier: (typeof qualifiers)[number]) {
  const string = ['title', 'tooltip', 'inline', 'group'].includes(slot);
  const kind = string ? 'string' : 'bool';
  const literal = string ? '"Text"' : 'true';
  if (qualifier === 'input') return `meta = input.${kind}(${literal})`;
  if (qualifier === 'series') return `${kind} meta = ${string ? 'str.tostring(bar_index)' : 'close > open'}`;
  return `${qualifier} ${kind} meta = ${literal}`;
}

for (const overload of overloads) {
  describe(`reference input metadata bindings: ${overload.name}`, () => {
    for (const [index, slot] of slots.entries()) {
      const rank = overload.firstRank + index;
      const ceiling = slot === 'active' ? 'input' : 'const';
      const parameterIndex = overload.parameters.indexOf(slot);
      for (const qualifier of qualifiers) {
        it(`ledger ${rank}: positional ${slot} ${qualifier}`, () => {
          const args: string[] = [...overload.defaults.slice(0, parameterIndex), 'meta'];
          const source = `//@version=6\nindicator("Input qualifier slots")\n${setup(slot, qualifier)}\nvalue = ${overload.callee}(${args.join(', ')})\nplot(close)`;
          const errors = checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
          const accepted = qualifier === 'const' || (slot === 'active' && qualifier === 'input');
          if (accepted) {
            expect(errors).toEqual([]);
          } else {
            expect(errors).toHaveLength(1);
            expect(errors[0].code).toBe('qualifier-mismatch');
            expect(errors[0].message).toContain(overload.callee);
            expect(errors[0].message).toContain(slot);
            expect(errors[0].message).toContain(ceiling);
          }
        });
      }
      if (slot !== 'active') {
        it(`ledger ${rank}: named ${slot} simple`, () => {
          const source = `//@version=6\nindicator("Input qualifier slots")\n${setup(slot, 'simple')}\nvalue = ${overload.callee}(${overload.named}, ${slot}=meta)\nplot(close)`;
          const errors = checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
          expect(errors).toHaveLength(1);
          expect(errors[0].code).toBe('qualifier-mismatch');
          expect(errors[0].message).toContain(overload.callee);
          expect(errors[0].message).toContain(slot);
          expect(errors[0].message).toContain('const');
        });
      }
    }
  });
}
