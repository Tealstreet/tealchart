import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from '../../tests/compat/fixtures';
import { parse } from '../parser/parser';
import { checkProgram } from './checker';

// Native v4 capture bundle: eight hash-pinned compiler refusals, Pine v5/v6.
// The evidence settles string arrays; numeric/NA overload policy is separate.
const nativeCases = [
  {
    name: 'trace-array-string-every-namespace-v5.pine',
    sha256: 'c0f15c335cbb00065cad68413236892171affb5d5186471612a07b3161fe2a91',
    source: `//@version=5
indicator("V4-ARRAY-STRING-EVERY-NAMESPACE-V5")
values = array.from("", "alpha")
result = array.every(values)
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
`,
  },
  {
    name: 'trace-array-string-every-namespace-v6.pine',
    sha256: '0554a7d9d5f457a978e780cb8dc7cbb2f2aad99e1882651819014bc29fc9ad2f',
    source: `//@version=6
indicator("V4-ARRAY-STRING-EVERY-NAMESPACE-V6")
values = array.from("", "alpha")
result = array.every(values)
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
`,
  },
  {
    name: 'trace-array-string-every-receiver-v5.pine',
    sha256: '0315a57585011d2d4dea5f84dbf8f1714b24b72f87cf51fa97c286338821eebb',
    source: `//@version=5
indicator("V4-ARRAY-STRING-EVERY-RECEIVER-V5")
values = array.from("", "alpha")
result = values.every()
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
`,
  },
  {
    name: 'trace-array-string-every-receiver-v6.pine',
    sha256: '52b733435c34698d0bffc8ba6be3203e754f1398cbf48e8c332dd4eb388baa20',
    source: `//@version=6
indicator("V4-ARRAY-STRING-EVERY-RECEIVER-V6")
values = array.from("", "alpha")
result = values.every()
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
`,
  },
  {
    name: 'trace-array-string-some-namespace-v5.pine',
    sha256: 'f05311d1ae976076d790dd71b4bc74e8065217322cd0b2edfab5e9b826a71651',
    source: `//@version=5
indicator("V4-ARRAY-STRING-SOME-NAMESPACE-V5")
values = array.from("", "alpha")
result = array.some(values)
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
`,
  },
  {
    name: 'trace-array-string-some-namespace-v6.pine',
    sha256: '8f68f60685b971765d762b8f90a7852d5bab24423a767e67c74a1bb9ad6b49ef',
    source: `//@version=6
indicator("V4-ARRAY-STRING-SOME-NAMESPACE-V6")
values = array.from("", "alpha")
result = array.some(values)
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
`,
  },
  {
    name: 'trace-array-string-some-receiver-v5.pine',
    sha256: '0af919315b1604529f917d7662f9ae873b40068657aaf4fcd1af10f612502af2',
    source: `//@version=5
indicator("V4-ARRAY-STRING-SOME-RECEIVER-V5")
values = array.from("", "alpha")
result = values.some()
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
`,
  },
  {
    name: 'trace-array-string-some-receiver-v6.pine',
    sha256: 'd9a28d74b2e0ac4961bc280d26165cb7d1f4a8d62e0b0e640bb11038d5240028',
    source: `//@version=6
indicator("V4-ARRAY-STRING-SOME-RECEIVER-V6")
values = array.from("", "alpha")
result = values.some()
plot(result == true ? 1 : result == false ? 0 : -1, "OUTCOME")
`,
  },
] as const;

const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');

describe('native string array predicate admission', () => {
  for (const { name, sha256, source } of nativeCases) {
    it(`refuses captured ${name}`, () => {
      expect(createHash('sha256').update(source).digest('hex')).toBe(sha256);
      const result = errors(source);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ code: 'type-mismatch', line: 4 });
      expect(result[0]?.message).toMatch(/array\.(every|some).*bool.*array<string>/);
    });
  }
});

for (const version of [5, 6]) {
  for (const method of ['every', 'some']) {
    const header = `//@version=${version}\nindicator("Predicate controls")\n`;
    it(`refuses named string ${method} v${version}`, () => {
      const result = errors(header + `values = array.from("", "alpha")\nresult = array.${method}(id=values)`);
      expect(result.map((d) => d.code)).toEqual(['type-mismatch']);
      expect(result[0]?.message).toContain('array<string>');
    });
    for (const receiver of [false, true]) {
      const call = receiver ? `values.${method}()` : `array.${method}(values)`;
      it(`retains boolean ${method} v${version} receiver=${receiver}`, () => {
        const source = header + `values = array.from(true, false)\nresult = ${call}\nplot(result ? 1 : 0, "Result")`;
        expect(errors(source)).toEqual([]);
        const result = runCompatScript(source);
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Result').values).toEqual(Array(12).fill(method === 'every' ? 0 : 1));
      });
    }
    it(`retains selected custom string ${method} v${version}`, () => {
      expect(
        errors(
          header +
            `method ${method}(array<string> values) => values.size() > 0\nvalues = array.from("", "alpha")\nresult = values.${method}()`,
        ),
      ).toEqual([]);
    });
    it(`retains imported callable named array.${method} v${version}`, () => {
      const program = parse(
        header + `import Example/Predicates/1 as array\narray<string> values = na\nresult = array.${method}(values)`,
      );
      const library = parse(
        `//@version=${version}\nlibrary("Predicates")\nexport ${method}(array<string> values) => values.size() > 0`,
      );
      expect(
        checkProgram(program, { libraries: new Map([['Example/Predicates/1', library]]) }).diagnostics.filter(
          (d) => d.severity === 'error',
        ),
      ).toEqual([]);
    });
    it(`retains missing-reference ${method} v${version} admission`, () => {
      expect(errors(header + `result = array.${method}(na)`)).toEqual([]);
    });
  }
}

for (const version of [3, 4]) {
  for (const method of ['every', 'some']) {
    it(`keeps pre-v5 string ${method} admission unchanged v${version}`, () => {
      expect(
        errors(
          `//@version=${version}\nstudy("Legacy admission regression")\nvalues = array.from("", "alpha")\nresult = array.${method}(values)`,
        ),
      ).toEqual([]);
    });
  }
}
