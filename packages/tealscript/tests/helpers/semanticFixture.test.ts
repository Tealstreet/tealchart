import { expect, it, vi } from 'vitest';

import * as parser from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { createSemanticFixture } from './semanticFixture';

it('parses common setup once while preserving spans and independent ASTs', () => {
  const header = '//@version=6\nindicator("Fixture")\n';
  const setup = 'value = close\nother = value * 2';
  const spy = vi.spyOn(parser, 'parse');
  const fixture = createSemanticFixture(header, setup);
  const first = fixture('plot(other)');
  const second = fixture('plot(value)');
  expect(spy.mock.calls.filter(([source]) => source.includes(setup))).toHaveLength(1);
  spy.mockRestore();
  expect(first).toEqual(parser.parse(header + setup + '\nplot(other)'));
  expect(second).toEqual(parser.parse(header + setup + '\nplot(value)'));
  expect(first.body[1]).not.toBe(second.body[1]);
  expect(checkProgram(first).diagnostics).toEqual([]);
  expect(checkProgram(second).diagnostics).toEqual([]);
});
