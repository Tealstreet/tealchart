import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

const nativeSource = `//@version=6
indicator("V13 history inference realtime jump BK v1")
offset = barstate.ishistory ? 100 : 150
plot(close[offset], "TARGET")
plot(offset, "OFFSET")
plot(barstate.isrealtime ? 1 : 0, "REALTIME")
plot(bar_index, "BAR_INDEX")
plot(close, "CLOSE_CONTROL")
`;

const bars = Array.from({ length: 201 }, (_, index) => ({
  time: (index + 1) * 120_000,
  open: index + 1,
  high: index + 2,
  low: index,
  close: index + 1,
  volume: 10,
}));

function run(source: string) {
  const compiled = tryCompile(parse(source));
  expect(compiled.success, compiled.unsupported.join('; ')).toBe(true);
  const result = executeCompiled(compiled, bars, undefined, { realtimeLastBar: { isNew: true } });
  if (!result) throw new Error('Missing compiled result');
  return result;
}

// Native v13 proves live refusal; historical startup completion was not separately witnessed.
// Fixture bars are synthetic; native bar number and buffer/error coordinate mapping are unclaimed.
describe('rank1787 native live history freeze facet', () => {
  it('refuses the SHA-pinned native source at its deeper realtime reference', () => {
    expect(createHash('sha256').update(nativeSource).digest('hex')).toBe(
      '28694a720ceeddf21a39f4606d3bc2c970eb3f4c2b119ded91431c85c3556c53',
    );
    const result = run(nativeSource);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/Historical offset 150 exceeds max_bars_back 100/);
  });

  it('permits the deeper realtime reference with an explicit sufficient declaration', () => {
    const result = run(
      nativeSource.replace(
        'indicator("V13 history inference realtime jump BK v1")',
        'indicator("Explicit history sizing", max_bars_back=150)',
      ),
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values.at(-1)).toBe(51);
  });

  it('does not apply a sufficient close buffer to an independently inferred open buffer', () => {
    const result = run(`${nativeSource}max_bars_back(close, 150)
openDepth = barstate.ishistory ? 1 : 150
plot(open[openDepth], "OPEN")
`);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/Historical offset 150 exceeds max_bars_back 1/);
    expect(result.plots[0].values.at(-1)).toBe(51);
  });
});
