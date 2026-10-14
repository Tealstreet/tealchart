import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram, type SemanticDiagnostic } from '../../src/semantic';

function errorChannel(diagnostics: readonly SemanticDiagnostic[]) {
  return diagnostics.filter((diagnostic) => diagnostic.severity === 'error').map((diagnostic) => ({
    code: diagnostic.nativeCode ?? (/^CE\d+$/.test(diagnostic.code) ? diagnostic.code : null),
    message: diagnostic.message,
    severity: diagnostic.severity,
    line: diagnostic.line,
    column: diagnostic.column,
  }));
}

const attempts = [
  {
    "observation": "v58/captures/v58/consumers/v5-security-float-first-function-v1/default/attempt-v1/observation-v1.json",
    "sourceSha256": "9f92d2ef5b6092cb9a15072bf0c5536ecf2c49b17b8ccbab2311611bdc40545a",
    "observationSha256": "d3eb15552160db492c289da0d8b8f2020e839b9368ddeb63b6f2b61cdbae039e",
    "rank": 5
  },
  {
    "observation": "v58/captures/v58/consumers/v5-security-float-first-method-v1/default/attempt-v1/observation-v1.json",
    "sourceSha256": "0905b941abd31b05e2e4971af1845052c36f80c1dd7797bdc6154963bbc6d10e",
    "observationSha256": "03368fe3b643c0f222b267e5c1e57bec88017ac0574de4fdcb7f826555925d3e",
    "rank": 5
  },
  {
    "observation": "v58/captures/v58/consumers/v5-security-int-first-function-v1/default/attempt-v1/observation-v1.json",
    "sourceSha256": "2f4efe88f0c66c854d41b15622ccc97b33f33367d788d9c0eee2b19506a17e86",
    "observationSha256": "8a2ea7e806d178871923301824229a4471774f6ab97d3fda52349751e33b023f",
    "rank": 5
  },
  {
    "observation": "v58/captures/v58/consumers/v5-security-int-first-method-v1/default/attempt-v1/observation-v1.json",
    "sourceSha256": "924e49575caf01b5a6d2d871452f2cf81f02ccfde88389ad64f9901aa292a178",
    "observationSha256": "62d2379aae6a61867c862218185a4e8cb97524d67da63c6b515b053f92b95f0d",
    "rank": 5
  },
  {
    "observation": "v58/captures/v58/consumers/v6-security-float-first-function-v1/default/attempt-v1/observation-v1.json",
    "sourceSha256": "dc8f3e84341613b7f4548a737641d94fc52fafd300690be1cb509911db4e4cb8",
    "observationSha256": "2282c7fe103d1a9c850df47ee1bf796e3d8eee5e1a2ecf4ac58a0918a2268c77",
    "rank": 5
  },
  {
    "observation": "v58/captures/v58/consumers/v6-security-float-first-method-v1/default/attempt-v1/observation-v1.json",
    "sourceSha256": "c85c99ad1b1ec868f52559d85adf1ac67e05ef5ea90990c436a45de20f5f21ff",
    "observationSha256": "f72805c80cb618767210b1d897875e3d56fca80e446cc0b9906a035a0428ad50",
    "rank": 5
  },
  {
    "observation": "v58/captures/v58/consumers/v6-security-int-first-function-v1/default/attempt-v1/observation-v1.json",
    "sourceSha256": "ff6c16cd301a7afc7b7645fe2d41719a99e3b2a00942e0ff20163e16317fc34b",
    "observationSha256": "2c3c84ce4fe0b5e00f5084d61a8a548e6276309a7a2bdf3592ebdcf462cfd4f3",
    "rank": 5
  },
  {
    "observation": "v58/captures/v58/consumers/v6-security-int-first-method-v1/default/attempt-v1/observation-v1.json",
    "sourceSha256": "1e865fa05fea2936ca608cee119a95d4ab229266d87cea49cc918c8c29f2f00a",
    "observationSha256": "f8abe829559177e3d46384f6cb26cb2dd34a657bcc3e3e6428b59c587c5e9a29",
    "rank": 5
  },
  {
    "observation": "v58/captures/v58/prerequisites/root2-library-0c3e7d5d2afc-v58-v1/attempt-v1/observation-v1.json",
    "sourceSha256": "46661b8a6bbbbe319767aa72ef0c7cfe640634e257b20309bd2fa8a61b49a5f2",
    "observationSha256": "86d8e63aaa9b4174b8c77db18d5d9371450b6602537ad8ca1cac5a9faabd3645",
    "rank": 5
  },
  {
    "observation": "v58/captures/v58/prerequisites/root2-library-547eb85fa13d-v58-v1/attempt-v1/observation-v1.json",
    "sourceSha256": "1298ca3cdd0f6e93d6fef32d9a40aa83d9a7eba42abae4ec6ae46c6ebbdae421",
    "observationSha256": "9abc8439b997f17cbbcc9322c8fe00940d69ec18b919fb559ac8e14719509125",
    "rank": 5
  },
  {
    "observation": "v71/captures/v71/unused-builtin-box-v6-natural-v2/attempt-v1/observation-v3.json",
    "sourceSha256": "8e46047f3e3e47ecf6e0696fb4f86544fa6a710461a34407dc7ff5b6d9c5ea5a",
    "observationSha256": "ade486bd12755faf7e11de2474d5391eeedd6d7ef69fce22b8c85289bf5a69e9",
    "rank": 17
  },
  {
    "observation": "v71/captures/v71/unused-builtin-footprint-v6-natural-v2/attempt-v1/observation-v3.json",
    "sourceSha256": "569e20dce5bba62b0ad63d37ea664b112c9a74e63e4520fb5ac9afb5ef76528a",
    "observationSha256": "762ced0ab58e4614a81bb04c9968d45f96eec8424ef51809a75f63f4518eddb1",
    "rank": 17
  }
] as const;

describe('captured unused-receiver overload diagnostic frontier', () => {
  it.each(attempts.map((attempt) => [attempt.observation, attempt] as const))('%s', (_, attempt) => {
    const raw = readFileSync(new URL(`../../oracle-probes/${attempt.observation}`, import.meta.url));
    expect(createHash('sha256').update(raw).digest('hex')).toBe(attempt.observationSha256);
    const native = JSON.parse(raw.toString());
    expect(createHash('sha256').update(native.executedSource).digest('hex')).toBe(attempt.sourceSha256);
    const expected = native.markers.filter((marker: { severity: number }) => marker.severity === 8).map((marker: {
      code?: string; message: string; severity: number; startLineNumber: number; startColumn: number;
    }) => ({
      code: marker.code ?? null,
      message: marker.message,
      severity: 'error',
      line: marker.startLineNumber,
      column: marker.startColumn,
    }));
    expect(errorChannel(checkProgram(parse(native.executedSource)).diagnostics)).toEqual(expected);
  });

  it.each([5, 6])('preserves a used first receiver and refused second receiver in v%s', (version) => {
    const source = `//@version=${version}\nindicator("Used first")\nmethod score(array<int> xs) => array.size(xs)\nmethod score(array<float> xs) => 20\nplot(1)`;
    expect(errorChannel(checkProgram(parse(source)).diagnostics)).toEqual([unused(version, 'xs', 4, 13)]);
  });

  it.each([5, 6])('preserves an unused first receiver and used second receiver in v%s', (version) => {
    const source = `//@version=${version}\nindicator("Used second")\nmethod score(array<int> xs) => 10\nmethod score(array<float> xs) => array.size(xs)\nplot(1)`;
    expect(errorChannel(checkProgram(parse(source)).diagnostics)).toEqual([unused(version, 'xs', 3, 13)]);
  });

  it.each([5, 6])('keeps independent method-name refusals in v%s', (version) => {
    const source = `//@version=${version}\nindicator("Distinct methods")\nmethod one(array<int> xs) => 10\nmethod two(array<float> xs) => 20\nplot(1)`;
    expect(errorChannel(checkProgram(parse(source)).diagnostics)).toEqual([
      unused(version, 'xs', 3, 11), unused(version, 'xs', 4, 11),
    ]);
  });

  it.each([5, 6])('retains parent diagnostics for overloads with additional parameters in v%s', (version) => {
    const source = `//@version=${version}\nindicator("Additional parameters")\nmethod score(array<int> xs, int n) => n\nmethod score(array<float> xs, int n) => n\nplot(1)`;
    expect(errorChannel(checkProgram(parse(source)).diagnostics)).toEqual([
      unused(version, 'xs', 3, 13), unused(version, 'xs', 4, 13),
    ]);
  });
});

function unused(version: number, name: string, line: number, column: number) {
  return {
    code: version === 6 ? 'CE10236' : null,
    message: `The ${version === 6 ? `"${name}"` : `'${name}'`} argument is not used. The first method argument should be used.`,
    severity: 'error', line, column,
  };
}
