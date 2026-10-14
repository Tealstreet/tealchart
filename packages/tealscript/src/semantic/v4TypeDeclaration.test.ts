import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createPineParseSemanticStageOutcomes } from '../compat/sourceStages';
import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
const message = "'type' is not a valid type keyword in variable declaration";
const fixture = (path: string) => readFileSync(new URL(`../../oracle-probes/v75/${path}`, import.meta.url), 'utf8');

describe('Pine v4 user-defined type declaration boundary', () => {
  it.each(
    ['box', 'label', 'line', 'linefill', 'table'].flatMap((namespace) =>
      ['natural', 'renamed-control'].map((role) => `ns-param-set-top-${namespace}-v4-${role}-v1`),
    ),
  )('matches the v75 declaration refusal: %s', (probe) => {
    const source = fixture(`${probe}.pine`);
    const observation = JSON.parse(fixture(`captures/v75/${probe}/attempt-v1/observation-v3.json`));
    expect(observation.executedSource).toBe(source);
    expect(observation.compilationStatus).toBe('REFUSED');
    expect(observation.firstErrorDiagnostic).toMatchObject({ text: message, line: 3, column: 1, code: null });
    expect(errors(source)).toContainEqual(
      expect.objectContaining({ code: 'version-mismatch', message, line: 3, column: 1 }),
    );
    expect(createPineParseSemanticStageOutcomes(source)).toContainEqual(
      expect.objectContaining({
        stage: 'semantic',
        status: 'failed',
        diagnostics: expect.arrayContaining([expect.objectContaining({ message, line: 3, column: 1 })]),
      }),
    );
  });

  it.each([
    ['unused', 'type Holder\n    int value\nplot(1)', 3, 1],
    ['constructed', 'type Holder\n    int value\nplot(Holder.new(7).value)', 3, 1],
    ['later declaration', 'plot(1)\ntype Other\n    float value', 4, 1],
  ])('refuses a v4 %s declaration', (_name, body, line, column) => {
    expect(errors(`//@version=4\nstudy("Type boundary")\n${body}`)).toContainEqual(
      expect.objectContaining({
        code: 'version-mismatch',
        message,
        line,
        column,
      }),
    );
  });

  it.each([5, 6])('preserves used and unused types in v%s', (version) => {
    for (const body of ['plot(1)', 'holder = Holder.new(7)\nplot(holder.value)']) {
      expect(errors(`//@version=${version}\nindicator("Type boundary")\ntype Holder\n    int value\n${body}`)).toEqual(
        [],
      );
    }
  });

  it('preserves v4 primitive declarations and functions', () => {
    expect(
      errors('//@version=4\nstudy("Primitive boundary")\nint value = 7\nscore(int x) => x + 1\nplot(score(value))'),
    ).toEqual([]);
  });
});
