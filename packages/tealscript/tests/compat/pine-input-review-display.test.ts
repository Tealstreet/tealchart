import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const kinds = [
  ['input', '3'],
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
] as const;
const diagnostics = (body: string) =>
  checkProgram(
    parse(`//@version=6
indicator("Input display")
enum Choice
    first
${body}
plot(close)`),
  ).diagnostics;

describe('input review const display ceiling', () => {
  for (const [kind, value] of kinds) {
    it(`${kind} refuses a series display expression`, () => {
      expect(diagnostics(`v=${kind}(${value}, display=bar_index==0?display.none:display.all)`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('display') }),
        ]),
      );
    });
    it(`${kind} accepts const display members and combinations`, () => {
      for (const display of ['display.none', 'display.all', 'display.status_line + display.data_window']) {
        expect(diagnostics(`v=${kind}(${value}, display=${display})`)).toEqual([]);
      }
    });
  }
});
