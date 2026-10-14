import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../parser';
import { checkProgram } from './checker';

const historyCodes = new Set(['inconsistent-local-history', 'inconsistent-function-history']);
const check = (source: string) => checkProgram(parse(source)).diagnostics;

describe('captured local-history failure frontiers', () => {
  it.each([
    ['w8-exact-source-compile-corpus-v7-427-v1.pine', 'cbedb2c50cf428eb62771a60dbf4f977be9ce6e661a79c1e32feedaedf17bcae'],
    ['w8-exact-source-compile-corpus-v56-580-v1.pine', 'abb8b8ecea0e2fd935f191b4a360158874e4e2629eff3f71f8af8e261aa417d2'],
  ])('omits local/UDF-history warnings from the complete v9 native frontier: %s', (name, hash) => {
    const source = readFileSync(new URL(`../../oracle-probes/v9/${name}`, import.meta.url), 'utf8');
    expect(createHash('sha256').update(source).digest('hex')).toBe(hash);
    const observation = readFileSync(new URL('../../oracle-probes/v9/captures/v9/outcomes-v9.json', import.meta.url), 'utf8');
    expect(createHash('sha256').update(observation).digest('hex')).toBe('43cf9618afc2e1c2ec69ff5681dccf93ae5b92db723cdb4f79b0d19245682970');
    const outcomes = JSON.parse(observation) as { source_sha256: string; status: string; diagnostic: { native: { compiler_markers: { startLineNumber: number }[] } } }[];
    const native = outcomes.find((outcome) => outcome.source_sha256 === hash);
    expect(native?.status).toBe('COMPILE-ERROR');
    expect(native?.diagnostic.native.compiler_markers.some((marker) => marker.startLineNumber === (name.includes('v7-427') ? 213 : 261))).toBe(false);
    const diagnostics = check(source);
    expect(diagnostics.filter(({ severity }) => severity === 'error').length).toBeGreaterThan(0);
    expect(diagnostics.filter(({ code }) => historyCodes.has(code))).toEqual([]);
  });

  it.each([5, 6])('preserves valid v%s conditional UDF history warnings', (version) => {
    const diagnostics = check(`//@version=${version}
indicator("History control")
previous(float src) => src[1]
plot(bar_index % 5 == 0 ? previous(close) : float(na))`);
    expect(diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
    expect(diagnostics.filter(({ code }) => code === 'inconsistent-function-history')).toHaveLength(1);
  });

  it.each([5, 6])('preserves valid v%s sparse local history warnings', (version) => {
    const diagnostics = check(`//@version=${version}
indicator("Local control")
if bar_index % 2 == 0
    basis = close + 7
    previous = basis[1]`);
    expect(diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
    expect(diagnostics.filter(({ code }) => code === 'inconsistent-local-history')).toHaveLength(1);
  });

  it.each([4, 5])('preserves unwitnessed v%s unknown-identifier warning policy', (version) => {
    const diagnostics = check(`//@version=${version}
${version === 4 ? 'study' : 'indicator'}("Version control")
previous(float src) => src[1]
plot(bar_index % 5 == 0 ? previous(close) : float(na))
plot(missing)`);
    expect(diagnostics.filter(({ code }) => code === 'inconsistent-function-history')).toHaveLength(1);
  });
  it('preserves warnings when an unwitnessed type failure precedes an unknown identifier', () => {
    const diagnostics = check(`//@version=6
indicator("Other frontier")
previous(float src) => src[1]
int value = 1.5
plot(bar_index % 5 == 0 ? previous(close) : float(na))
plot(missing)`);
    expect(diagnostics.find(({ severity }) => severity === 'error')?.code).toBe('type-mismatch');
    expect(diagnostics.filter(({ code }) => code === 'inconsistent-function-history')).toHaveLength(1);
  });

});
