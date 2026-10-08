import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('standalone UDT enum fields retain defaults titles and copy independence', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Enum object copy")
enum Direction
    up = "Upper"
    down = "Lower"
type State
    Direction side = Direction.up
    int count = 17
a = State.new()
b = ${receiver ? 'a.copy()' : 'State.copy(a)'}
plot(b.side == Direction.up ? 1 : 0, "InitialMember")
plot(str.tostring(b.side) == "Upper" ? 1 : 0, "InitialTitle")
b.side := Direction.down
b.count := 5
plot(a.side == Direction.up ? 1 : 0, "SourceMember")
plot(str.tostring(b.side) == "Lower" ? 1 : 0, "CopyTitle")
a.count := -31
plot(b.count, "CopyCount")
fresh = State.new()
plot(str.tostring(fresh.side) == "Upper" ? 1 : 0, "FreshTitle")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['InitialMember', 'InitialTitle', 'SourceMember', 'CopyTitle', 'FreshTitle']) {
        expect(getPlot(result, title).values).toEqual([1, 1, 1]);
      }
      expect(getPlot(result, 'CopyCount').values).toEqual([5, 5, 5]);
    });
  }
});
