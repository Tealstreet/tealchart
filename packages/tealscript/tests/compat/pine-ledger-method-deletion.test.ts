import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';
import { checkProgram } from '../../src/semantic/checker';

// Ledger ranks 404/405/433/434: label.delete and line.delete methods/receivers.
// The reference specifies that deletion does nothing when the object is already absent.
const bars: Bar[] = [{ time: 60_000, open: 12, high: 19, low: 9, close: 12, volume: 10 }];

describe('label and line method deletion after absence', () => {
  it.each([
    ['label', 'label.new(0, 12, "remove")', 'label.new(1, 19, "keep")', { type: 'label', text: 'keep', x: 1, y: 19 }],
    ['line', 'line.new(0, 12, 1, 14)', 'line.new(2, 19, 3, 17)', { type: 'line', x1: 2, y1: 19, x2: 3, y2: 17 }],
  ])('keeps a live %s when a different receiver is deleted twice', (_kind, removed, kept, expected) => {
    const ast = parse(`//@version=6\nindicator("Repeated method deletion", overlay=true)\nremoved = ${removed}\nkept = ${kept}\nremoved.delete()\nremoved.delete()`);
    expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.drawings).toHaveLength(1);
    expect(result.drawings[0]).toMatchObject(expected);
  });
});
