import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.is_identity';

describe('matrix.is_identity returns false for non-square matrices', () => {
  for (const form of ['namespace', 'receiver'] as const) {
    it(`${form} rejects rectangular identity patterns and retains square controls`, () => {
      for (const kind of ['int', 'float']) {
        const statements = ['//@version=6', 'indicator("Non-square identity")'];
        for (const [index, [rows, columns]] of [[1, 2], [2, 1], [2, 3], [3, 2]].entries()) {
          statements.push(`m${index} = matrix.new<${kind}>(${rows}, ${columns}, 0)`);
          for (let diagonal = 0; diagonal < Math.min(rows, columns); diagonal++) {
            statements.push(`matrix.set(m${index}, ${diagonal}, ${diagonal}, 1)`);
          }
        }
        statements.push(
          `identity = matrix.new<${kind}>(2, 2, 0)`,
          'matrix.set(identity, 0, 0, 1)',
          'matrix.set(identity, 1, 1, 1)',
          'wrong = matrix.copy(identity)',
          'matrix.set(wrong, 1, 1, 2)',
        );
        for (const [index, name] of ['m0', 'm1', 'm2', 'm3', 'identity', 'wrong'].entries()) {
          const call = form === 'namespace' ? `matrix.is_identity(${name})` : `${name}.is_identity()`;
          statements.push(`plot(${call} ? 1 : 0, "Case ${index}")`);
        }
        const result = runCompatScript(statements.join('\n'));
        expect(result.errors, reference).toEqual([]);
        for (const [index, value] of [0, 0, 0, 0, 1, 0].entries()) {
          expect(getPlot(result, `Case ${index}`).values, `${reference}; ${kind}; case ${index}`).toEqual(Array(12).fill(value));
        }
      }
    });
  }
});
