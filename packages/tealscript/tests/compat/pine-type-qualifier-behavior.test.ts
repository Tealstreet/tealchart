import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Authority: https://www.tradingview.com/pine-script-reference/v6/.
// Entry selectors below use kind/name (and parameter name for overloaded functions).
// Ledger: type-qualifier-system-v1. These are source-level functional checks.
const header = '//@version=6\nindicator("Documented types")\n';
const sources = [
  { qualifier: 'const', expression: '2.5' },
  { qualifier: 'input', expression: 'input.float(2.5)' },
  { qualifier: 'simple', expression: 'syminfo.mintick' },
  { qualifier: 'series', expression: 'close' },
] as const;

function check(body: string) {
  return checkProgram(parse(header + body));
}

describe('documented qualifier acceptance', () => {
  // Reference: type/const, type/simple, type/series hierarchy;
  // function/input.float defval: const float; function/plot histbase: input int/float.
  // Ledger: qualifier rank order and all four parameter acceptance rows.
  // RED proof: inverted isAssignableQualifier for the 12 const/simple/series cells;
  // renamed plot signature histbase for the two input acceptance cells. All failed
  // and passed restored. The two input refusals failed on the unmodified engine
  // (open defect TYPE-QUALIFIER-PLOT-HISTBASE). INVERSE proof: in an isolated
  // copy, added input-rank enforcement for plot histbase using existing argument
  // binding; both assertions passed as ordinary tests, then the copy was discarded.
  // This rejects reversed
  // hierarchy, equality-only acceptance, and accepting every argument.
  const targets = [
    { qualifier: 'const', prefix: '', call: 'input.float(value)' },
    { qualifier: 'input', prefix: '', call: 'plot(close, histbase=value)' },
    { qualifier: 'simple', prefix: 'consume(simple float x) => x\n', call: 'consume(value)' },
    { qualifier: 'series', prefix: 'consume(series float x) => x\n', call: 'consume(value)' },
  ] as const;

  for (const [targetRank, target] of targets.entries()) {
    for (const [sourceRank, source] of sources.entries()) {
      it(`${target.qualifier} parameter ${sourceRank <= targetRank ? 'accepts' : 'refuses'} ${source.qualifier}`, () => {
        const result = check(`${target.prefix}value = ${source.expression}\n${target.call}`);
        if (sourceRank <= targetRank) {
          expect(result.diagnostics).toEqual([]);
        } else {
          expect(result.diagnostics).toEqual([
            expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining(`Cannot pass ${source.qualifier} value to ${target.qualifier} parameter`) }),
          ]);
        }
      });
    }
  }
});

describe('documented strongest operand inference', () => {
  // Reference: type/simple and type/series descriptions, hierarchy/inference;
  // function/input.float return input float; variable/syminfo.mintick simple float;
  // variable/close series float. Ledger: strongest operand propagation.
  // RED proof for EVERY cell: maxQualifier returned undefined instead of its join;
  // all 16 failed and all passed restored. Both operand orders reject left-only
  // and right-only propagation; equal-rank cells reject gratuitous promotion.
  for (const [leftRank, left] of sources.entries()) {
    for (const [rightRank, right] of sources.entries()) {
      it(`joins ${left.qualifier} + ${right.qualifier}`, () => {
        const result = check(`lhs = ${left.expression}\nrhs = ${right.expression}\nvalue = lhs + rhs`);
        expect(result.diagnostics).toEqual([]);
        expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({
          kind: 'float', qualifier: sources[Math.max(leftRank, rightRank)].qualifier,
        });
      });
    }
  }
});
