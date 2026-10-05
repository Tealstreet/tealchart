import { describe, expect, it } from 'vitest';

import { runCompatScript } from './fixtures';

const calls = [
  ['input.bool', 'true'],
  ['input.int', '3'],
  ['input.float', '3.0'],
  ['input.string', '"A"'],
  ['input.text_area', '"A"'],
  ['input.symbol', '"NASDAQ:AAPL"'],
  ['input.timeframe', '"60"'],
  ['input.session', '"0900-1700"'],
  ['input.source', 'close'],
  ['input.color', 'color.red'],
  ['input.time', '1700000000000'],
  ['input.price', '3.0'],
  ['input.enum', 'Choice.first'],
  ['input', 'true'],
  ['input', '3'],
  ['input', '1.0'],
  ['input', '"A"'],
  ['input', 'color.red'],
  ['input', 'close'],
] as const;

describe('input review omitted titles', () => {
  it.each(calls)('%s(%s) inherits its assigned variable name', (kind, value) => {
    const result = runCompatScript(`//@version=6
indicator("Input title")
enum Choice
    first
selected=${kind}(${value})
plot(close)`);
    expect(result.errors).toEqual([]);
    expect(result.inputs).toEqual([expect.objectContaining({ title: 'selected' })]);
  });
});
