import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const captures = [
  {
    name: 'g02-v5-array-reassigned-before-int-int-int-first-untyped',
    held: false,
  },
  {
    name: 'g02-v6-array-reassigned-before-int-int-int-first-untyped',
    held: false,
  },
  {
    name: 'g02-v6-matrix-int-last-bar-reassignment-chain-untyped',
    held: true,
  },
  {
    name: 'g02-v6-map-branch-reassign-int-int-int-first-untyped',
    held: false,
  },
  {
    name: 'g03-v5-array-reassigned-before-float-int-int-first-untyped',
    held: false,
  },
  {
    name: 'g04-v5-array-if-two-origins-int-float-int-first-untyped',
    held: false,
  },
  {
    name: 'g04-v6-array-if-two-origins-int-float-int-first-untyped',
    held: false,
  },
  {
    name: 'g04-v6-matrix-for-shadow-int-float-int-first-untyped',
    held: false,
  },
  {
    name: 'g04-v6-map-while-local-int-float-int-first-untyped',
    held: false,
  },
  {
    name: 'g05-v5-array-int-var-inside-if-untyped',
    held: true,
  },
  {
    name: 'g05-v6-array-int-var-inside-if-untyped',
    held: true,
  },
  {
    name: 'g05-v6-matrix-int-var-inside-loop-untyped',
    held: true,
  },
  {
    name: 'g05-v6-map-int-var-only-on-enabled-path-untyped',
    held: true,
  },
  {
    name: 'g06-v5-array-int-if-expression-once-untyped',
    held: false,
  },
  {
    name: 'g06-v6-array-int-if-expression-once-untyped',
    held: false,
  },
  {
    name: 'g06-v6-matrix-int-switch-arm-untyped',
    held: false,
  },
  {
    name: 'g06-v6-map-int-unary-terminal-untyped',
    held: false,
  },
  {
    name: 'g06-v6-map-int-ternary-argument-untyped',
    held: false,
  },
  {
    name: 'g07-v5-array-varip-alias-int-float-int-first-untyped',
    held: false,
  },
  {
    name: 'g07-v6-array-varip-alias-int-float-int-first-untyped',
    held: false,
  },
  {
    name: 'g07-v6-matrix-int-varip-overload-still-refused-untyped',
    held: true,
  },
  {
    name: 'g07-v6-map-int-var-and-varip-overload-expression-untyped',
    held: true,
  },
  {
    name: 'g08-v5-array-conditional-initializer-int-float-int-first-untyped',
    held: false,
  },
  {
    name: 'g08-v6-array-conditional-initializer-int-float-int-first-untyped',
    held: false,
  },
  {
    name: 'g08-v6-matrix-ternary-initializer-int-float-int-first-untyped',
    held: false,
  },
  {
    name: 'g09-v5-array-namespace-copy-int-float-int-first-untyped',
    held: false,
  },
  {
    name: 'g09-v6-array-namespace-copy-int-float-int-first-untyped',
    held: false,
  },
  {
    name: 'g09-v6-matrix-receiver-copy-int-float-int-first-untyped',
    held: false,
  },
  {
    name: 'g09-v6-map-int-copy-initializer-untyped',
    held: true,
  },
  {
    name: 'g10-v5-array-udt-field-int-untyped',
    held: false,
  },
  {
    name: 'g10-v6-array-udt-field-int-untyped',
    held: false,
  },
  {
    name: 'g10-v6-matrix-udt-alias-field-int-untyped',
    held: false,
  },
  {
    name: 'g10-v6-map-int-udt-field-alias-untyped',
    held: true,
  },
  {
    name: 'g11-v5-array-int-identity-initializer-untyped',
    held: false,
  },
  {
    name: 'g11-v6-array-int-identity-initializer-untyped',
    held: false,
  },
  {
    name: 'g11-v6-matrix-int-identity-initializer-untyped',
    held: false,
  },
  {
    name: 'g11-v6-map-int-identity-initializer-untyped',
    held: false,
  },
];
const archive = new URL('../../oracle-probes/v58/captures/v58/consumers/', import.meta.url);

describe('collection overloads resolve from written-call types', () => {
  for (const { name, held } of captures) {
    it(`${name}: concrete collection selection${held ? ' (initial history unavailable)' : ''}`, () => {
      const directory = new URL(`${name}/default/attempt-v1/`, archive);
      const source = readFileSync(new URL('executed-v1.pine', directory), 'utf8');
      const ast = parse(source);
      expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const compiled = tryCompile(ast);
      expect(compiled.success).toBe(true);
      if (held) return;
      const observation = JSON.parse(readFileSync(new URL('observation-v2.json', directory), 'utf8'));
      const [header, ...lines] = readFileSync(new URL('native-v1.csv', directory), 'utf8').trim().split(/\r?\n/);
      const rows = lines.map((line) => line.split(','));
      expect(header.split(',').slice(6)).toEqual(
        observation.csv.observerColumns.map((column: { title: string }) => column.title),
      );
      const bars = rows.map((row) => ({
        time: Number(row[0]) * 1000,
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: row[5] === '' ? NaN : Number(row[5]),
      }));
      const result = executeCompiled(compiled, bars, undefined, {
        runtime: {
          timeframe: { period: observation.setup.timeframe },
          syminfo: { tickerid: observation.setup.symbol, timezone: observation.setup.timezone, mintick: 0.01 },
        },
      });
      expect(result).toBeDefined();
      expect(result!.errors).toEqual([]);
      expect(result!.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result!.plots).toHaveLength(observation.csv.observerColumns.length);
      let closedRows = 0;
      for (const [index, row] of rows.entries()) {
        if (Number(row[0]) > Number(observation.closedBarCutoff)) continue;
        closedRows++;
        for (const [column, plot] of result!.plots.entries()) {
          expect(plot.values).toHaveLength(rows.length);
          const raw = row[6 + column],
            value = plot.values[index];
          if (raw === '') expect(value == null || Number.isNaN(value)).toBe(true);
          else {
            const expected = Number(raw);
            const precision = raw.includes('.') ? 0.51 * 10 ** -raw.split('.')[1].length : 0;
            expect(typeof value).toBe('number');
            expect(Math.abs(value! - expected)).toBeLessThanOrEqual(
              Math.max(precision, Math.abs(expected) * 2e-12, 1e-10),
            );
          }
        }
      }
      expect(closedRows).toBe(observation.csv.closedRowCount);
      expect(closedRows).toBeGreaterThan(0);
    });
  }
});
