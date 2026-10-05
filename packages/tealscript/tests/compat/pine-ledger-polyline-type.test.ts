import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const setup = `//@version=6
indicator("polyline keyword")
identity(polyline shape) => shape
points = array.from(chart.point.from_index(0, 1), chart.point.from_index(1, 2))
polyline shape = polyline.new(points)
`;

describe('documented polyline type keyword', () => {
  it('declares a created polyline and typed function parameter', () => {
    const result = checkProgram(parse(setup + 'alias = identity(shape)\n'));
    expect(result.diagnostics).toEqual([]);
    for (const name of ['shape', 'alias']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type).toEqual({ kind: 'polyline', qualifier: 'series' });
    }
  });
  it('enforces the declared polyline parameter family', () => {
    const result = checkProgram(parse(setup + 'alias = identity(2)\n'));
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'type-mismatch', message: expect.stringMatching(/polyline.*int|int.*polyline/) }));
  });
});
