import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string slice fill preserves its parent borders and writes empty strings', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const lines: string[] = [];
      for (const [stage, seed] of [['Empty', ''], ['Text', 'Az']] as const) {
        lines.push(receiver ? `s.fill("${seed}", 1, 3)` : `array.fill(index_to=3, value="${seed}", id=s, index_from=1)`);
        ['outside', 'guard', 'A', seed, seed, 'D', 'end', 'tail'].forEach((value, i) => lines.push(`plot(parent.get(${i}) == "${value}" ? 1 : 0, "${stage}Parent${i}")`));
        ['A', seed, seed, 'D'].forEach((value, i) => lines.push(`plot(s.get(${i}) == "${value}" ? 1 : 0, "${stage}Slice${i}")`));
      }
      const result = runCompatScript(`//@version=${version}\nindicator("String slice fill")\nparent = array.from("outside", "guard", "A", "B", "C", "D", "end", "tail")\ns = parent.slice(2, 6)\n${lines.join('\n')}\nplot(parent.size(), "ParentSize")\nplot(s.size(), "SliceSize")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const stage of ['Empty', 'Text']) {
        for (let i = 0; i < 8; i++) expect(getPlot(result, `${stage}Parent${i}`).values).toEqual([1, 1, 1]);
        for (let i = 0; i < 4; i++) expect(getPlot(result, `${stage}Slice${i}`).values).toEqual([1, 1, 1]);
      }
      expect(getPlot(result, 'ParentSize').values).toEqual([8, 8, 8]);
      expect(getPlot(result, 'SliceSize').values).toEqual([4, 4, 4]);
    });
  }
});
