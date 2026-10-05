import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Native v23 attempt1: exact source hashes and CE10149 diagnostics, ledger385/386.
const cases = [
  {
    source:
      '//@version=6\nindicator("V23 explicit plot type keyword")\nplot value = plot(1, "Value", display=display.data_window)\n',
    code: 'CE10149',
    message: '"plot" is not a valid type keyword.',
    line: 3,
    column: 1,
    kind: 'plot',
    sha256: 'fc76f6ae16e94cf149d3aa1b7a61c000b6cb2bf07d6d9e82b655f0ec8d6839a0',
  },
  {
    source: '//@version=6\nindicator("V23 explicit hline type keyword")\nhline value = hline(1, "Level")\n',
    code: 'CE10149',
    message: '"hline" is not a valid type keyword.',
    line: 3,
    column: 1,
    kind: 'hline',
    sha256: 'e2439fc8872041437f7b38f5f7b2264641e9322f5899cfd41d04ad675c6a572f',
  },
];

describe('native v23 plot and hline type keywords', () => {
  it.each(cases)('matches captured $kind text and start with the existing internal code', (entry) => {
    expect(createHash('sha256').update(entry.source).digest('hex')).toBe(entry.sha256);
    const errors = checkProgram(parse(entry.source)).diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toEqual([
      {
        code: 'invalid-type-annotation',
        message: entry.message,
        line: entry.line,
        column: entry.column,
        severity: 'error',
      },
    ]);
  });
  it('retains the captured inferred control', () => {
    expect(
      checkProgram(
        parse(
          '//@version=6\nindicator("V23 inferred plot and hline control")\np = plot(1, "CONTROL", display=display.data_window)\nh = hline(1, "Level")\n',
        ),
      ).diagnostics,
    ).toEqual([]);
  });
});
