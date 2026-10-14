import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';
import { readV58Refusal } from './v58NativeFixtures';

const rows = [
  {
    id: 'V58-142',
    ...readV58Refusal(
      'v58/captures/v58/consumers/nested-method-direct-exact-v58-v1/default/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/nested-method-direct-exact-v58-v1/default/attempt-v1/observation-v1.json',
    ),
  },
  {
    id: 'V58-143',
    ...readV58Refusal(
      'v58/captures/v58/consumers/nested-method-direct-chart-symbol-companion-v58-v1/default/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/nested-method-direct-chart-symbol-companion-v58-v1/default/attempt-v1/observation-v1.json',
    ),
  },
  {
    id: 'V58-144',
    ...readV58Refusal(
      'v58/captures/v58/consumers/nested-method-helper-exact-v58-v1/default/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/nested-method-helper-exact-v58-v1/default/attempt-v1/observation-v1.json',
    ),
  },
  {
    id: 'V58-145',
    ...readV58Refusal(
      'v58/captures/v58/consumers/nested-method-helper-chart-symbol-companion-v58-v1/default/attempt-v1/executed-v1.pine',
      'v58/captures/v58/consumers/nested-method-helper-chart-symbol-companion-v58-v1/default/attempt-v1/observation-v1.json',
    ),
  },
];
describe('v58 overload globals', () => {
  for (const row of rows.filter((row) => ['V58-142', 'V58-143', 'V58-144', 'V58-145'].includes(row.id))) {
    it(row.id, () =>
      expect(
        checkProgram(parse(row.source)).diagnostics.some(
          (d) => d.severity === 'error' && d.message.includes('global variable'),
        ),
      ).toBe(true),
    );
  }
});

describe('overload global controls', () => {
  for (const version of [5, 6]) {
    for (const [name, declarations] of [
      ['nonoverloaded', 'value = close\nmethod pick(float self) => self + value'],
      ['local', 'method pick(int self) =>\n    value = self + 1\n    value\nmethod pick(float self) => self + 1'],
      ['builtin', 'method pick(int self) => self + close\nmethod pick(float self) => self + close'],
      ['const', 'value = 10\nmethod pick(int self) => self + value\nmethod pick(float self) => self + value'],
    ]) {
      it(`v${version} ${name}`, () =>
        expect(
          checkProgram(
            parse(`//@version=${version}\nindicator("globals")\n${declarations}\nplot(close.pick())`),
          ).diagnostics.filter((d) => d.severity === 'error'),
        ).toEqual([]));
    }
  }
});
