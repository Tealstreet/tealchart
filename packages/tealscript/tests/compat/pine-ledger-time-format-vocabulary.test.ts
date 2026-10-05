import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const cases = [
  { title: 'documented tokens', call: 'str.format_time(1704467115123, "yyyy M d a h H m s SSS Z", "UTC")', expected: '2024 1 5 PM 3 15 5 15 123 +0000' },
  { title: 'default ISO format', call: 'str.format_time(time=1704467115123, timezone="UTC")', expected: '2024-01-05T15:05:15+0000' },
  { title: 'fixed GMT offset', call: 'str.format_time(1704467115123, "yyyy-MM-dd HH:mm:ss Z", "GMT+2")', expected: '2024-01-05 17:05:15 +0200' },
  { title: 'IANA winter offset', call: 'str.format_time(1704467115123, "yyyy-MM-dd HH:mm:ss Z", "America/New_York")', expected: '2024-01-05 10:05:15 -0500' },
  { title: 'IANA summer offset', call: 'str.format_time(1720191915123, "yyyy-MM-dd HH:mm:ss Z", "America/New_York")', expected: '2024-07-05 11:05:15 -0400' },
] as const;

describe('documented time format vocabulary', () => {
  for (const item of cases) {
    it(item.title, () => {
      const bars = [{ time: 60_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }];
      const result = executeScript(parse(`//@version=6
indicator("time vocabulary")
formatted = ${item.call}
plot(formatted == "${item.expected}" ? 1 : 0)
`), bars);
      expect(result.errors).toEqual([]);
      expect(result.plots[0]?.values).toEqual([1]);
    });
  }
});
