import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const fixture = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const libraries = new Map([
  ['sours-lat/R2Nsaa411cdaddab/1', parse(fixture('v58/root2-library-aa411cdaddab-v58-v1.pine'))],
]);
const entries = [
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/first-named-explicit-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "ecb06a0ff39c28664c30ac4e8086f96259e1204a94edd7070022ca010b7b69b6",
    "observation": "v58/captures/v58/consumers/first-named-explicit-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/first-named-explicit-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 9,
        "column": 6,
        "nativeCode": "CE10133"
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/first-named-omitted-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "74d7ca3b30d099196e884f8121a3c9e0d4b2beed6e9a256840c9ad313a6be3d8",
    "observation": "v58/captures/v58/consumers/first-named-omitted-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/first-named-omitted-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 9,
        "column": 6,
        "nativeCode": "CE10133"
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/nested-request-explicit-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "3088c856090fbd2e13cc43f0baf68633b23be853555ed5dbd18a4abf66f0e12a",
    "observation": "v58/captures/v58/consumers/nested-request-explicit-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/nested-request-explicit-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 9,
        "column": 6,
        "nativeCode": "CE10133"
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/nested-request-omitted-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "b691a64b186cdbbcaabd3bca22a614e9964129663a29124c092405e20e1da286",
    "observation": "v58/captures/v58/consumers/nested-request-omitted-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/nested-request-omitted-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 9,
        "column": 6,
        "nativeCode": "CE10133"
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v5-direct-float-function-omitted-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "e2d02062a4ea01c5769d9561b3dd28dcbddcebf87288388fe11cafacf12252ee",
    "observation": "v58/captures/v58/consumers/v5-direct-float-function-omitted-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v5-direct-float-function-omitted-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v5-direct-float-function-supplied-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "192581237abec3e8d886e89b365e7b0f6fabde17512f8ac45edbb48e847a37eb",
    "observation": "v58/captures/v58/consumers/v5-direct-float-function-supplied-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v5-direct-float-function-supplied-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v5-direct-float-method-omitted-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "e175728febfe629a48b29c710d96e33e01d1159730effc45d1b2913fed21c237",
    "observation": "v58/captures/v58/consumers/v5-direct-float-method-omitted-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v5-direct-float-method-omitted-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v5-direct-float-method-supplied-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "653ffd384357038818ab8fba3044ed739aadbf200bd1e10c80c12b3cf9cf4ac6",
    "observation": "v58/captures/v58/consumers/v5-direct-float-method-supplied-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v5-direct-float-method-supplied-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v5-security-float-function-omitted-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "b20897066222d51138c75190abd1535949b8d6c6230c00a0a2bd6b177c39583a",
    "observation": "v58/captures/v58/consumers/v5-security-float-function-omitted-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v5-security-float-function-omitted-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v5-security-float-function-supplied-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "523c93e8cb954a8aa69cddfbdb970f38d9e054a3fa7bd110e9552ef2150dba1c",
    "observation": "v58/captures/v58/consumers/v5-security-float-function-supplied-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v5-security-float-function-supplied-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v5-security-float-method-omitted-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "6500868de2da860dd67238ad89dbb59d975662c2952a64b3931782a65aad403e",
    "observation": "v58/captures/v58/consumers/v5-security-float-method-omitted-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v5-security-float-method-omitted-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v5-security-float-method-supplied-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "25d64cc5daecee44490c65a3c1ae2c322ea6a464ec1d3877f3224c40474841b9",
    "observation": "v58/captures/v58/consumers/v5-security-float-method-supplied-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v5-security-float-method-supplied-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v6-direct-float-function-omitted-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "378f434a179499b9b129a7f99751105285fadc81b891029f7b0ed0d25fc9d318",
    "observation": "v58/captures/v58/consumers/v6-direct-float-function-omitted-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v6-direct-float-function-omitted-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6,
        "nativeCode": "CE10133"
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v6-direct-float-function-supplied-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "0e45b4edbd5e98126529030aeb1bbec17e57340e082188336e81696799b43dd8",
    "observation": "v58/captures/v58/consumers/v6-direct-float-function-supplied-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v6-direct-float-function-supplied-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6,
        "nativeCode": "CE10133"
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v6-direct-float-method-omitted-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "fe13c588abb9cc0a40b25eef5f67799ab00768937051eacfe28d517c0dcc1ee0",
    "observation": "v58/captures/v58/consumers/v6-direct-float-method-omitted-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v6-direct-float-method-omitted-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6,
        "nativeCode": "CE10133"
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v6-direct-float-method-supplied-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "1954f11fa9c274339ae6f6a0e202b602eed062b1de0d293f34be830002981f8b",
    "observation": "v58/captures/v58/consumers/v6-direct-float-method-supplied-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v6-direct-float-method-supplied-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6,
        "nativeCode": "CE10133"
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v6-security-float-function-omitted-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "b05d932a811a2d1530faf89523c66c814145680decacc7f50c3faf05272e37fa",
    "observation": "v58/captures/v58/consumers/v6-security-float-function-omitted-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v6-security-float-function-omitted-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6,
        "nativeCode": "CE10133"
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v6-security-float-function-supplied-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "0da4b9aef31c03919ccbcfcb2aaedc176a1a94409fc23f73538572a73863c4b3",
    "observation": "v58/captures/v58/consumers/v6-security-float-function-supplied-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v6-security-float-function-supplied-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6,
        "nativeCode": "CE10133"
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v6-security-float-method-omitted-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "fb7191ab249ba23a1b4e1e7f315dd138b50d74d7e9d5d08c2f49b9ceeadb9c74",
    "observation": "v58/captures/v58/consumers/v6-security-float-method-omitted-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v6-security-float-method-omitted-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6,
        "nativeCode": "CE10133"
      }
    ]
  },
  {
    "classId": "diagnostic-precedence",
    "source": "v58/captures/v58/consumers/v6-security-float-method-supplied-v1/default/attempt-v1/executed-v1.pine",
    "sha256": "d23ed6d602e3a5b4b3b8dde2171d6818a1565b2b66fbdf3cb88fb79b87216511",
    "observation": "v58/captures/v58/consumers/v6-security-float-method-supplied-v1/default/attempt-v1/observation-v1.json",
    "attempt": "v58/captures/v58/consumers/v6-security-float-method-supplied-v1/default/attempt-v1",
    "expected": [
      {
        "message": "The default value cannot be a function, variable or calculation.",
        "line": 6,
        "column": 6,
        "nativeCode": "CE10133"
      }
    ]
  },
  {
    "classId": "v5-import-v6",
    "source": "v60/private-method-exported-forward-control-v5-v2.pine",
    "sha256": "076e12cf4744a21297428b983ec8342446fd6641ff7bc3cda660150af7dba44a",
    "observation": "v60/captures/v60/private-method-exported-forward-control-v5-v2/attempt-v1/observation-v5.json",
    "attempt": "v60/captures/v60/private-method-exported-forward-control-v5-v2/attempt-v1",
    "expected": [
      {
        "message": "Cannot import the 'lib' library into a script coded in Pine Script\u2122 v5. Convert the script to Pine Script\u2122 v6 to use this library.",
        "line": 3,
        "column": 8
      }
    ]
  },
  {
    "classId": "v5-import-v6",
    "source": "v60/private-method-private-receiver-v5-v2.pine",
    "sha256": "103e2f08bd7ace29fe206f0c0c3d670f8afe5f462b866fe5d7ff829352cf5834",
    "observation": "v60/captures/v60/private-method-private-receiver-v5-v2/attempt-v1/observation-v5.json",
    "attempt": "v60/captures/v60/private-method-private-receiver-v5-v2/attempt-v1",
    "expected": [
      {
        "message": "Cannot import the 'lib' library into a script coded in Pine Script\u2122 v5. Convert the script to Pine Script\u2122 v6 to use this library.",
        "line": 3,
        "column": 8
      },
      {
        "message": "Could not find method or method reference 'pick' for 'float'",
        "line": 4,
        "column": 11
      }
    ]
  }
] as const;
const errorsFor = (source: string) => checkProgram(parse(source), { libraries }).diagnostics.filter((d) => d.severity === 'error');

describe('captured callable-default and import diagnostic precedence', () => {
  for (const entry of entries) {
    it(`${entry.classId}: ${entry.attempt}`, () => {
      const source = fixture(entry.source);
      const observation = JSON.parse(fixture(entry.observation));
      expect(createHash('sha256').update(source).digest('hex')).toBe(entry.sha256);
      expect(observation.executedSource).toBe(source);
      expect(observation.status).toBe('COMPILE-ERROR');
      const native = observation.markers.filter((marker: { severity: number }) => marker.severity === 8);
      for (const diagnostic of entry.expected) {
        expect(native).toContainEqual(expect.objectContaining({
          message: diagnostic.message,
          startLineNumber: diagnostic.line,
          startColumn: diagnostic.column,
          ...('nativeCode' in diagnostic ? { code: diagnostic.nativeCode } : {}),
        }));
      }
      const errors = errorsFor(source);
      expect(errors).toHaveLength(entry.expected.length);
      entry.expected.forEach((diagnostic, index) => expect(errors[index]).toMatchObject(diagnostic));
    });
  }

  for (const version of [5, 6]) {
    it(`v${version} retains unused array receivers without an invalid default`, () => {
      const source = `//@version=${version}
indicator("Receiver control")
method score(array<int> xs) => 10
method score(array<float> xs) => 20
plot(score(array.new<float>(1, 0)))`;
      // V58 v5/v6-security-float-first-function-v1/default/attempt-v1 reports only the first unused numeric-array overload.
      const receiverCode = version === 6 ? 'CE10236' : 'unused-method-receiver';
      expect(errorsFor(source).map((d) => d.code)).toEqual([receiverCode]);
    });

    it(`v${version} retains overloaded nonconst global refusals without an invalid default`, () => {
      const source = `//@version=${version}
indicator("Global control")
float unused = close
method sample(int self) => unused + self
method sample(float self) => self
plot(close.sample())`;
      expect(errorsFor(source).map((d) => d.code)).toEqual(['overload-global-variable']);
    });

    it(`v${version} admits ordinary literal defaults and used receivers`, () => {
      const source = `//@version=${version}
indicator("Default control")
method score(array<int> xs) => array.get(xs, 0)
method score(array<float> xs) => array.get(xs, 0)
read(value=10) => value
plot(read() + score(array.new<float>(1, 20)))`;
      expect(errorsFor(source)).toEqual([]);
    });
  }

  it('keeps unrelated method definition errors beside an invalid callable default', () => {
    const source = `//@version=6
indicator("Unrelated control")
method unrelated(array<int> xs) => 10
method unrelated(array<float> xs) => 20
seed() => 6
read(value=seed()) => value
plot(read())`;
    // V58 v6-security-float-first-function-v1/default/attempt-v1 reports one unused numeric-array overload.
    // The independent invalid-default assertion stays alongside that captured receiver frontier.
    expect(errorsFor(source).map((d) => d.code)).toEqual([
      'CE10236', 'invalid-parameter-default',
    ]);
  });

  for (const version of [5, 6]) {
    it(`admits an exported forward from a matching v${version} library`, () => {
      const compatible = new Map([['QA/Compatible/1', parse(`//@version=${version}
library("Compatible")
method pick(float self) => self + 10
export forward(float self) => self.pick()`)] ]);
      const source = `//@version=${version}
indicator("Compatible control")
import QA/Compatible/1 as lib
plot(lib.forward(3.5))`;
      expect(checkProgram(parse(source), { libraries: compatible }).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    });
  }


  it('does not infer a published library version from unversioned host source', () => {
    const compatible = new Map([['QA/Compatible/1', parse('library("Compatible")\nexport forward(float self) => self + 10')]]);
    const source = '//@version=5\nindicator("Unknown version control")\nimport QA/Compatible/1 as lib\nplot(lib.forward(3.5))';
    expect(checkProgram(parse(source), { libraries: compatible }).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('does not confuse a builtin default call with same-named local methods', () => {
    const source = '//@version=6\nindicator("Builtin control")\nmethod get(array<int> xs) => 10\nmethod get(array<float> xs) => 20\nread(value=array.get(array.from(6), 0)) => value\nplot(read())';
    // V58 v6-security-float-first-function-v1/default/attempt-v1 reports one unused numeric-array overload.
    // The independent invalid-default assertion stays alongside that captured receiver frontier.
    expect(errorsFor(source).map((d) => d.code)).toEqual([
      'CE10236', 'invalid-parameter-default',
    ]);
  });

});
