import { createHash } from 'node:crypto';

import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const nativeCases = [
  [
    'array',
    '//@version=6\nindicator("varip enum array eligibility")\nenum State\n    member\nvarip array<State> values = array.new<State>()\nplot(array.size(values), "OUTCOME")\n',
    '62bfdc762b282d5859453d7fd74d7f168df97b4f13924e6732e5747a78392196',
  ],
  [
    'matrix',
    '//@version=6\nindicator("varip enum matrix eligibility")\nenum State\n    member\nvarip matrix<State> values = matrix.new<State>()\nplot(matrix.rows(values), "OUTCOME")\n',
    '4b9b370d028b5958f907574d5d760b2cb631842d2d2c227569ea489545ac112f',
  ],
  [
    'map',
    '//@version=6\nindicator("varip enum map eligibility")\nenum State\n    member\nvarip map<int, State> values = map.new<int, State>()\nplot(map.size(values), "OUTCOME")\n',
    '81e6aed7f701a5da563184bc34cf882f330afae24fa43efd81d8a3d2e656498a',
  ],
] as const;
const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((item) => item.severity === 'error');

it.each(nativeCases)('retains native varip enum %s refusal', (_, source, sha) => {
  expect(createHash('sha256').update(source).digest('hex')).toBe(sha);
  expect(errors(source)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('varip') }),
    ]),
  );
});

it('keeps scalar enum admission separate from varip enum collections', () => {
  expect(
    errors(
      '//@version=6\nindicator("scalar enum")\nenum State\n    member\nvarip State value = State.member\nplot(value == State.member ? 1 : 0)',
    ),
  ).toEqual([]);
});

it.each(nativeCases)('keeps ordinary enum %s collections admitted', (_, source) => {
  expect(errors(source.replace('\nvarip ', '\nvar '))).toEqual([]);
});

it('keeps a direct ordinary enum variable admitted', () => {
  expect(
    errors(
      '//@version=6\nindicator("ordinary enum")\nenum State\n    member\nState value = State.member\nplot(value == State.member ? 1 : 0)',
    ),
  ).toEqual([]);
});

it.each(['line', 'label', 'box', 'table'])('retains varip drawing %s collection refusal', (kind) => {
  expect(
    errors(
      `//@version=6\nindicator("drawing collection")\nvarip array<${kind}> values = array.new<${kind}>()\nplot(array.size(values))`,
    ),
  ).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]));
});
