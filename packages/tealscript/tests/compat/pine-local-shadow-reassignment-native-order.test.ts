import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const prefix = 'v58/captures/v58/consumers/g03-v6-map-chain-after-reassign-float-int-int-first-typed/default/attempt-v1/';
const source = readFileSync(new URL(`../../oracle-probes/${prefix}executed-v1.pine`, import.meta.url), 'utf8');
const observation = JSON.parse(readFileSync(new URL(`../../oracle-probes/${prefix}observation-v1.json`, import.meta.url), 'utf8'));

// Authority: v58 g03 typed map reassignment attempt1, complete marker order.
// Neighboring shapes below preserve parent policy and receive no native credit.
describe('captured local shadow and reassignment order', () => {
  it('matches both complete native markers in captured order', () => {
    expect(createHash('sha256').update(source).digest('hex')).toBe('c0bb6afaaf337e858a97010b61c7ef83cf0ead6ae06fea0a9afa631176b5f6ff');
    const expected = observation.markers.map((marker: { code: string; severity: number; message: string; startLineNumber: number; startColumn: number }) => ({
      code: marker.code, message: marker.message, severity: marker.severity === 4 ? 'warning' : 'error', line: marker.startLineNumber, column: marker.startColumn,
    }));
    expect(expected).toHaveLength(2);
    expect(checkProgram(parse(source)).diagnostics.map(({ nativeCode, code, ...diagnostic }) => ({ ...diagnostic, code: nativeCode ?? code }))).toEqual(expected);
  });

  it('keeps the captured untyped map assignment before its shadow warning', () => {
    const untypedPrefix = prefix.replace('-typed/', '-untyped/');
    const input = readFileSync(new URL(`../../oracle-probes/${untypedPrefix}executed-v1.pine`, import.meta.url), 'utf8');
    const native = JSON.parse(readFileSync(new URL(`../../oracle-probes/${untypedPrefix}observation-v1.json`, import.meta.url), 'utf8'));
    expect(createHash('sha256').update(input).digest('hex')).toBe('465babc736012c4af4808b1d9cb33d3d925e2845d5b448ee69fab55a832c968c');
    const expected = native.markers.map((marker: { code: string; severity: number; message: string; startLineNumber: number; startColumn: number }) => ({
      code: marker.code, message: marker.message, severity: marker.severity === 4 ? 'warning' : 'error', line: marker.startLineNumber, column: marker.startColumn,
    }));
    expect(expected).toHaveLength(2);
    expect(checkProgram(parse(input)).diagnostics.map(({ nativeCode, code, ...diagnostic }) => ({ ...diagnostic, code: nativeCode ?? code }))).toEqual(expected);
  });

  it('preserves v5 admission and generic warning', () => {
    const diagnostics = checkProgram(parse(source.replace('//@version=6', '//@version=5'))).diagnostics;
    expect(diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
    expect(diagnostics.filter(({ code }) => code === 'builtin-shadow')).toEqual([
      { code: 'builtin-shadow', message: "Variable 'second' shadows a Pine builtin", severity: 'warning', line: 8, column: 5 },
    ]);
  });

  it.each([
    ['array alias', source.replaceAll('map<string,int>', 'array<int>').replaceAll('map<string,float>', 'array<float>').replaceAll('map.new<string,int>()', 'array.new<int>()').replaceAll('map.new<string,float>()', 'array.new<float>()')],
    ['different builtin name', source.replaceAll('second', 'close')],
    ['additional parameter', source.replace('map<string,int> ys) =>', 'map<string,int> ys, int extra) =>').replace('plot(relay(map.new<string,float>(),map.new<string,int>()))', 'plot(relay(map.new<string,float>(),map.new<string,int>(),1))')],
    ['intervening statement', source.replace('    second = copied', '    spacer = 1\n    second = copied')],
  ])('preserves neighboring source order: %s', (_label, input) => {
    const diagnostics = checkProgram(parse(input)).diagnostics;
    const error = diagnostics.findIndex(({ severity }) => severity === 'error');
    const warning = diagnostics.findIndex(({ code }) => code === 'builtin-shadow');
    expect(error).toBeGreaterThanOrEqual(0);
    expect(warning).toBeGreaterThan(error);
  });
});
