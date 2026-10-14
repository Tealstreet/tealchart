import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const cases = [
  {
    "attempt": "v58/captures/v58/consumers/g01-v5-array-chain-two-int-float-int-first-typed/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/g01-v5-array-chain-two-int-float-int-first-typed/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/g01-v5-array-chain-two-int-float-int-first-typed/default/attempt-v1/observation-v3.json",
    "sourceSha256": "5194cda7b6e8c50e35ea827a90141ab6699f895dbc33a52850d5c75c953be626",
    "observationSha256": "9d7f87514a5445f824b26fd1ed9321b6b4415c7cb53cec49ee4df0630445fcbd",
    "native": {
      "message": "Shadowing built-in variable 'second'",
      "line": 7,
      "column": 5,
      "nativeCode": null
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/g01-v5-array-chain-two-int-float-int-first-untyped/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/g01-v5-array-chain-two-int-float-int-first-untyped/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/g01-v5-array-chain-two-int-float-int-first-untyped/default/attempt-v1/observation-v2.json",
    "sourceSha256": "2c3c6c9725992a997e8f441249cb01a1b323b1cabff060529b0e736c2263d1fb",
    "observationSha256": "ba1370961e0f4800b3e24cf786a682448fb06b631b4fc3f8a40c3f8028692ed9",
    "native": {
      "message": "Shadowing built-in variable 'second'",
      "line": 7,
      "column": 5,
      "nativeCode": null
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/g01-v6-array-chain-two-int-float-int-first-typed/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/g01-v6-array-chain-two-int-float-int-first-typed/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/g01-v6-array-chain-two-int-float-int-first-typed/default/attempt-v1/observation-v2.json",
    "sourceSha256": "49854b13734baeecf46224786eada8e4fd026b33490b2b2d11982f20d86ff700",
    "observationSha256": "b9ae5b51a7b79b47621eec59e6c69ed72de6c2fb97fea0f59f50f1a453a77d58",
    "native": {
      "message": "Shadowing built-in variable \"second\"",
      "line": 7,
      "column": 5,
      "nativeCode": "CW10011"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/g01-v6-array-chain-two-int-float-int-first-untyped/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/g01-v6-array-chain-two-int-float-int-first-untyped/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/g01-v6-array-chain-two-int-float-int-first-untyped/default/attempt-v1/observation-v2.json",
    "sourceSha256": "feeb4812c874568769fd875f193f09fb15b8e49af6de3d2c813f2c860056d7f2",
    "observationSha256": "e691e20302d606a13a8cc93babe8278647bdce4c387fcdd8bb265344e3749781",
    "native": {
      "message": "Shadowing built-in variable \"second\"",
      "line": 7,
      "column": 5,
      "nativeCode": "CW10011"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/g01-v6-map-other-parameter-chain-int-float-int-first-typed/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/g01-v6-map-other-parameter-chain-int-float-int-first-typed/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/g01-v6-map-other-parameter-chain-int-float-int-first-typed/default/attempt-v1/observation-v2.json",
    "sourceSha256": "eb5c7d9b9862e111c9fda56f9284f29773489f84f137c23e4ce2a6697f3a2e1e",
    "observationSha256": "0292d5bb0754037fb002caed856541e6557f462ab873d602327ab54138400007",
    "native": {
      "message": "Shadowing built-in variable \"second\"",
      "line": 8,
      "column": 5,
      "nativeCode": "CW10011"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/g01-v6-map-other-parameter-chain-int-float-int-first-untyped/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/g01-v6-map-other-parameter-chain-int-float-int-first-untyped/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/g01-v6-map-other-parameter-chain-int-float-int-first-untyped/default/attempt-v1/observation-v2.json",
    "sourceSha256": "cf787998cd34db637dff4ec3bc225944a887bef027884523753b657c51c43b64",
    "observationSha256": "78faa3b3e3bb56b819f8b88e094af62d20348ce6a0311e581b50cad027963a96",
    "native": {
      "message": "Shadowing built-in variable \"second\"",
      "line": 8,
      "column": 5,
      "nativeCode": "CW10011"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/g01-v6-matrix-var-chain-int-float-int-first-typed/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/g01-v6-matrix-var-chain-int-float-int-first-typed/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/g01-v6-matrix-var-chain-int-float-int-first-typed/default/attempt-v1/observation-v2.json",
    "sourceSha256": "17dce34ee6b4cb67a022590eefdcb98d1f323f849ff31cc7e21a0d87a3479c8c",
    "observationSha256": "b3d1a798d66a45609d518307bf19c3a9a5748e111658434a34f368008b8e4fa5",
    "native": {
      "message": "Shadowing built-in variable \"second\"",
      "line": 7,
      "column": 5,
      "nativeCode": "CW10011"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/g01-v6-matrix-var-chain-int-float-int-first-untyped/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/g01-v6-matrix-var-chain-int-float-int-first-untyped/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/g01-v6-matrix-var-chain-int-float-int-first-untyped/default/attempt-v1/observation-v2.json",
    "sourceSha256": "6570c383bbfcadf87e413fa338e15c685efe1cb51fb21bff8f321d6f26b5d7dc",
    "observationSha256": "b6ccbd897e55bf8a104adabd9b79b171dc12976c7fa7e3bbad0dee18c8a43759",
    "native": {
      "message": "Shadowing built-in variable \"second\"",
      "line": 7,
      "column": 5,
      "nativeCode": "CW10011"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/g03-v6-map-chain-after-reassign-float-int-int-first-typed/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/g03-v6-map-chain-after-reassign-float-int-int-first-typed/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/g03-v6-map-chain-after-reassign-float-int-int-first-typed/default/attempt-v1/observation-v1.json",
    "sourceSha256": "c0bb6afaaf337e858a97010b61c7ef83cf0ead6ae06fea0a9afa631176b5f6ff",
    "observationSha256": "34d9cb77a6e5d72b5b093236ea28498ed151cf1ccd5a9fd93d48a972c7d0582c",
    "native": {
      "message": "Shadowing built-in variable \"second\"",
      "line": 8,
      "column": 5,
      "nativeCode": "CW10011"
    }
  },
  {
    "attempt": "v58/captures/v58/consumers/g03-v6-map-chain-after-reassign-float-int-int-first-untyped/default/attempt-v1",
    "sourcePath": "v58/captures/v58/consumers/g03-v6-map-chain-after-reassign-float-int-int-first-untyped/default/attempt-v1/executed-v1.pine",
    "observationPath": "v58/captures/v58/consumers/g03-v6-map-chain-after-reassign-float-int-int-first-untyped/default/attempt-v1/observation-v1.json",
    "sourceSha256": "465babc736012c4af4808b1d9cb33d3d925e2845d5b448ee69fab55a832c968c",
    "observationSha256": "e16e72ab1f5bdd72559c3fa82b70c8b98b0b126b3b96a2bdd912d613e3c30fa3",
    "native": {
      "message": "Shadowing built-in variable \"second\"",
      "line": 8,
      "column": 5,
      "nativeCode": "CW10011"
    }
  }
] as const;

describe('captured builtin second shadow warnings', () => {
  it.each(cases)('$attempt', ({ sourcePath, observationPath, sourceSha256, observationSha256, native }) => {
    const root = new URL('../../oracle-probes/', import.meta.url);
    const source = readFileSync(new URL(sourcePath, root), 'utf8');
    const rawObservation = readFileSync(new URL(observationPath, root), 'utf8');
    const hash = (text: string) => createHash('sha256').update(text).digest('hex');
    expect(hash(source)).toBe(sourceSha256);
    expect(hash(rawObservation)).toBe(observationSha256);
    const observation = JSON.parse(rawObservation);
    expect(observation.executedSha256).toBe(sourceSha256);
    expect(observation.markers).toContainEqual(expect.objectContaining({
      message: native.message, startLineNumber: native.line, startColumn: native.column,
      ...(native.nativeCode ? { code: native.nativeCode } : {}),
    }));
    const diagnostics = checkProgram(parse(source)).diagnostics;
    const warnings = diagnostics.filter((diagnostic) => diagnostic.code === 'builtin-shadow');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toEqual({
      code: 'builtin-shadow', severity: 'warning', message: native.message,
      line: native.line, column: native.column,
      ...(native.nativeCode ? { nativeCode: native.nativeCode } : {}),
    });
    if (source.startsWith('//@version=5')) {
      expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    }
  });

  it.each([
    ['v5 global alias', '//@version=5\nindicator("control")\ncopied = array.new<int>()\nsecond = copied\nplot(1)'],
    ['v5 local literal', '//@version=5\nindicator("control")\nrelay() =>\n    second = 3\n    second\nplot(relay())'],
    ['v5 other name', '//@version=5\nindicator("control")\nrelay(array<int> xs) =>\n    close = xs\n    array.size(close)\nplot(relay(array.new<int>()))'],
    ['v5 scalar alias', '//@version=5\nindicator("control")\nrelay(int xs) =>\n    second = xs\n    second\nplot(relay(3))'],
    ["v5 untyped scalar two-alias", "//@version=5\nindicator(\"scalar alias boundary\")\nrelay(xs) =>\n    first = xs\n    second = first\n    second\nplot(relay(3))"],
    ["v5 uncalled untyped two-alias", "//@version=5\nindicator(\"uncalled control\")\nrelay(xs) =>\n    first = xs\n    second = first\n    second\nplot(1)"],
    ["v5 mixed scalar and array contexts", "//@version=5\nindicator(\"mixed context control\")\nrelay(xs) =>\n    first = xs\n    second = first\n    1\nplot(relay(3) + relay(array.new<int>()))"],
    ['v6 tuple', '//@version=6\nindicator("control")\npair() => [1, 2]\n[first, second] = pair()\nplot(first)'],
  ])('preserves unwitnessed wording for %s', (_label, source) => {
    const diagnostics = checkProgram(parse(source)).diagnostics;
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const warnings = diagnostics.filter((diagnostic) => diagnostic.code === 'builtin-shadow');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toBe(`Variable '${source.includes('    close =') ? 'close' : 'second'}' shadows a Pine builtin`);
    expect(warnings[0].nativeCode).toBeUndefined();
  });
});
