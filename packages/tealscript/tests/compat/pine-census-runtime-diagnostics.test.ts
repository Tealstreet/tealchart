import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';

const cases = [
  {
    "path": "v4/trace-array-nearest-rank-float-dynamic-high-v6.pine",
    "sha": "8aae401a2b9ef829e44ec19f96e1d9da96b9437f90d950fe185fc6d5e5072b2f",
    "text": "Error on bar 40: Invalid value of the 'percentage' argument (101) in the 'array.percentile_nearest_rank' function. It must be in the range [0..100].",
    "line": 5,
    "code": "RE10002"
  },
  {
    "path": "v4/trace-array-nearest-rank-float-dynamic-low-v6.pine",
    "sha": "c6648656934e683f328a26b834750f337309a0ad5dae02596a502281ceb56755",
    "text": "Error on bar 40: Invalid value of the 'percentage' argument (-1) in the 'array.percentile_nearest_rank' function. It must be in the range [0..100].",
    "line": 5,
    "code": "RE10002"
  },
  {
    "path": "v4/trace-array-nearest-rank-int-dynamic-high-v6.pine",
    "sha": "b02a1adeadef967cad0eafed932fdf776b694e93567ffe54fef8aa5558e50dab",
    "text": "Error on bar 40: Invalid value of the 'percentage' argument (101) in the 'array.percentile_nearest_rank' function. It must be in the range [0..100].",
    "line": 5,
    "code": "RE10002"
  },
  {
    "path": "v4/trace-array-nearest-rank-int-dynamic-low-v6.pine",
    "sha": "dc78ca43f335849619b067500f76cce67c73512705bffc461252792dbc7eb6fe",
    "text": "Error on bar 40: Invalid value of the 'percentage' argument (-1) in the 'array.percentile_nearest_rank' function. It must be in the range [0..100].",
    "line": 5,
    "code": "RE10002"
  },
  {
    "path": "v4/corpus5-change-negative-v1.pine",
    "sha": "a78c744ea3a4a1a52ef03f15e4a499f2d5f48eb98cf9fc724481b2ec9162d1eb",
    "text": "Error on bar 0: Invalid value of the 'length' argument (-1) in the ''change'' function. It must be > 0.",
    "line": 3,
    "code": "RE10001"
  },
  {
    "path": "v4/corpus5-change-zero-v1.pine",
    "sha": "0b125c6cf46664f2d8225a1995c2bbeffa3fa495d2ab0216615e39dca99068f3",
    "text": "Error on bar 0: Invalid value of the 'length' argument (0) in the ''change'' function. It must be > 0.",
    "line": 3,
    "code": "RE10001"
  },
  {
    "path": "v2/outcome-only/conflicts-batch-23-v1.pine",
    "sha": "0e4cf9d693b660fcdb131928882e186f990d6705e1b59bf1e71e817828ace262",
    "text": "Error on bar 0: Unmatched braces in the pattern.",
    "line": 17,
    "code": null
  },
  {
    "path": "v2/outcome-only/conflicts-batch-24-v1.pine",
    "sha": "39a2b4a323b4a42c276b3bcb1ec44df0ea07bc5d01cba6ea9b9bfcb5d3ded178",
    "text": "Error on bar 0: Cannot format given Object as a Number",
    "line": 17,
    "code": null
  },
  {
    "path": "v4/corpus5-v5-history-price-offset-v1.pine",
    "sha": "8ae4fc7a5addb3e81f781db818dd7b078499ffc73cb5910fe42e92782433fd13",
    "text": "Error on bar 0: Invalid number of bars back specified in the history-referencing operator. It accepts a value between 0 and 10000.",
    "line": 4,
    "code": "RE10007"
  },
  {
    "path": "v4/corpus5-matrix-negative-identity-power-v1.pine",
    "sha": "1b770d87ce52689dc5bf49b6dd23656f7de2310724af9fae996d5abe192063ec",
    "text": "Error on bar 0: In the 'matrix.pow()' function. The 'power' argument must be positive.",
    "line": 3,
    "code": "RE10090"
  }
] as const;
const bars = Array.from({ length: 50 }, (_, i) => ({ time: 1700000000000 + i * 60000, open: 77674, high: 77680, low: 77660, close: 77674, volume: 1000 }));
it.each(cases)('matches captured runtime diagnostic $path', (entry) => {
  const source = readFileSync(new URL(`../../oracle-probes/${entry.path}`, import.meta.url), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe(entry.sha);
  const round = entry.path.split('/')[0];
  const outcomeFile = JSON.parse(readFileSync(new URL(`../../oracle-probes/${round}/captures/${round}/outcomes-${round}.json`, import.meta.url), 'utf8'));
  const observations = Array.isArray(outcomeFile) ? outcomeFile : outcomeFile.outcomes;
  const native = observations.find((row: { script?: string; probe?: string; attempt: number }) => (row.script ?? row.probe) === entry.path.split('/').at(-1) && row.attempt === 1);
  expect(native).toBeDefined();
  expect(native.status ?? native.runtime.status).toBe('RUNTIME-ERROR');
  if (native.source_sha256) expect(native.source_sha256).toBe(entry.sha);
  const diagnostic = native.diagnostic ?? native.runtime.error;
  expect(diagnostic.text ?? diagnostic.context_substituted_message).toBe(entry.text);
  expect(diagnostic.line ?? diagnostic.stack_trace?.[0]?.p).toBe(entry.line);
  if (entry.code !== null) expect(diagnostic.code).toBe(entry.code);
  const execution = executeCompiledScript(parse(source), bars);
  expect(execution.status).toBe('success');
  if (execution.status !== 'success') return;
  expect(execution.result.errors).toHaveLength(1);
  const error = execution.result.errors[0];
  expect(error).toBeDefined();
  expect(error.message).toBe(entry.text.replace('{bar_index}', '0'));
  expect(error.runtimeError?.message).toBe(error.message);
  expect(error.barIndex).toBe(entry.path.includes('nearest-rank') ? 40 : 0);
  expect(error.runtimeError?.barIndex).toBe(error.barIndex);
  expect(error.line).toBe(entry.line);
  expect(error.runtimeError?.line).toBe(entry.line);
  expect(error.column).toBeUndefined();
  if (entry.code !== null) {
    expect(error.code).toBe(entry.code);
    expect(error.runtimeError?.code).toBe(entry.code);
  }
});
