import { describe, expect, it } from 'vitest';

import { PINE_V6_KNOWN_MISSING_BUILTINS } from '../../src/compat/pineV6BuiltinReference';
import { PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX } from '../../src/compat/pineV6ReferenceManualIndex';
import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import type { Bar } from '../../src/runtime/context';
import { executeScript } from '../../src/runtime/engine';
import { resolvesBuiltinReferenceNameForCoverage } from '../../src/semantic/checker';

const bars: Bar[] = [
  { time: Date.UTC(2024, 0, 2, 13, 0), open: 10, high: 12, low: 9, close: 11, volume: 100 },
  { time: Date.UTC(2024, 0, 2, 15, 0), open: 11, high: 13, low: 10, close: 12, volume: 110 },
  { time: Date.UTC(2024, 0, 2, 22, 0), open: 12, high: 14, low: 11, close: 13, volume: 120 },
];

const executionOptions = {
  runtime: {
    session: {
      timezone: 'America/New_York',
      premarket: '0400-0930:23456',
      regular: '0930-1600:23456',
      postmarket: '1600-2000:23456',
    },
  },
};

const auditedMemberValueNames = [...new Set([
  ...PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX.variables,
  ...PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX.constants,
])]
  .filter((name) =>
    name.includes('.')
    && !PINE_V6_KNOWN_MISSING_BUILTINS.includes(name)
    && resolvesBuiltinReferenceNameForCoverage(name),
  )
  .sort();

describe('compiled builtin member value emission', () => {
  it('does not emit bare builtin namespace object reads for official value members', () => {
    expect(auditedMemberValueNames).toHaveLength(358);

    const failures: string[] = [];
    for (const name of auditedMemberValueNames) {
      const namespace = name.split('.')[0]!;
      const source = `//@version=6
strategy("Member value audit")
_audit = ${name}
log.info("ok")
`;
      const ast = parse(source);
      const compiled = tryCompile(ast);
      if (!compiled.success) {
        failures.push(`${name}: compile fallback ${compiled.unsupported.join('; ')}`);
        continue;
      }

      if (new RegExp(`_getField\\(${namespace}\\b`).test(compiled.generatedCode ?? '')) {
        failures.push(`${name}: generated code reads bare ${namespace} namespace through _getField`);
        continue;
      }

      const compiledResult = executeCompiled(compiled, bars, undefined, executionOptions);
      const interpreterResult = executeScript(ast, bars, undefined, executionOptions);
      if (!compiledResult) {
        failures.push(`${name}: compiled execution returned no result`);
        continue;
      }

      if (compiledResult.errors.length > 0 || interpreterResult.errors.length > 0) {
        failures.push(`${name}: compiled errors=${compiledResult.errors.length}, interpreter errors=${interpreterResult.errors.length}`);
        continue;
      }

      if (compiledResult.logs.length !== interpreterResult.logs.length) {
        failures.push(`${name}: compiled logs=${compiledResult.logs.length}, interpreter logs=${interpreterResult.logs.length}`);
      }
    }

    expect(failures).toEqual([]);
  });
});
