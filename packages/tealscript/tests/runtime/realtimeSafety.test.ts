import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { analyzeCompiledRealtimeSafety } from '../../src/runtime/realtimeSafety';

describe('compiled realtime safety diagnostics', () => {
  it('reports the source construct and location that force realtime interpreter fallback', () => {
    const ast = parse(`//@version=6
indicator("Realtime Safety")
type State
    float total = 0
varip ticks = 0
var State state = State.new()
var array<float> samples = array.new<float>()
state.total += close
array.push(samples, close)
plot(array.size(samples) + ticks[1] + state.total)`);

    const analysis = analyzeCompiledRealtimeSafety(ast);

    expect(analysis.safe).toBe(false);
    expect(analysis.fallbackReason).toBe(
      'compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation; persistent-compound-mutation; varip-declaration',
    );
    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({
        reason: 'varip-declaration',
        construct: 'varip declaration ticks',
        line: 5,
        column: 1,
      }),
      expect.objectContaining({
        reason: 'persistent-compound-mutation',
        construct: 'compound mutation of persistent state state',
        line: 8,
        column: 1,
      }),
      expect.objectContaining({
        reason: 'collection-mutation',
        construct: 'collection mutator array.push',
        line: 9,
        column: 1,
      }),
      expect.objectContaining({
        reason: 'persistent-collection-mutation',
        construct: 'persistent collection mutation array.push(samples)',
        line: 9,
        column: 1,
      }),
      expect.objectContaining({
        reason: 'history-with-intrabar-state',
        construct: 'history reference []',
        line: 10,
        column: 28,
      }),
    ]);
  });
});
