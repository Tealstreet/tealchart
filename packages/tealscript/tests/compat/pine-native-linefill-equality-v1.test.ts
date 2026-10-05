import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const bundle = new URL('../../oracle-probes/v2/', import.meta.url);

it('rejects the captured linefill equality during semantic compilation', () => {
  const source = readFileSync(new URL('coverage-drawing-2-v1.pine', bundle), 'utf8');
  expect(createHash('sha256').update(source).digest('hex')).toBe(
    'c201da90e7c04bd1c0cb70ccb3656a3c1ab5056c304255f7892d5869cc69d28f',
  );
  const native = JSON.parse(readFileSync(new URL('captures/v2/outcomes-v2.json', bundle), 'utf8')).outcomes.filter(
    (outcome: { probe: string }) => outcome.probe === 'coverage-drawing-2-v1.pine',
  );
  expect(native).toHaveLength(2);
  for (const outcome of native) {
    expect(outcome.runtime.status).toBe('COMPILE-ERROR');
    expect(outcome.runtime.error.editorError.ctx).toMatchObject({
      funId: 'operator ==',
      argumentType: 'series linefill',
    });
  }

  const errors = checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  expect(errors).toEqual([
    expect.objectContaining({
      code: 'invalid-operator-operands',
      line: native[0].runtime.error.editorError.start.line,
      column: native[0].runtime.error.editorError.start.column,
      message: expect.stringMatching(/Operator ==.*linefill/),
    }),
  ]);
});
