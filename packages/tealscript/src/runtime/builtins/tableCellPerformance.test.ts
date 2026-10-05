import type { DrawingBuiltinRuntime } from './drawings';
import type { BuiltinRegistry } from './registry';

import { describe, expect, it } from 'vitest';

import { ExecutionContext } from '../context';
import { Scope } from '../scope';
import { registerTableBuiltins } from './drawings';

function tableRuntime() {
  const ctx = new ExecutionContext();
  const scope = new Scope();
  const builtins: BuiltinRegistry = new Map();
  const runtime: DrawingBuiltinRuntime = {
    raiseRuntimeError: (message) => {
      throw new Error(message);
    },
    isNa: (value) => value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value)),
    toNumber: Number,
    toNullableNumber: (value) => (Number.isFinite(Number(value)) ? Number(value) : null),
    toStringValue: String,
    toNullableColor: (value) => (typeof value === 'string' ? value : null),
    toOptionalString: (value) => (value === undefined ? undefined : String(value)),
    toLineWidth: Number,
    toDrawingId: String,
    withLine: () => {
      throw new Error('Unexpected line call');
    },
    getLineValue: () => {
      throw new Error('Unexpected line call');
    },
    interpolateLinePrice: () => {
      throw new Error('Unexpected line call');
    },
  };
  registerTableBuiltins(builtins, runtime);
  const call = (name: string, args: unknown[], named = new Map<string, unknown>()) => {
    const builtin = builtins.get(name);
    if (!builtin) throw new Error(`Missing builtin ${name}`);
    return builtin(args, named, ctx, scope, name);
  };
  return { ctx, call };
}

describe('table cell lookup performance', () => {
  it('updates a populated table within one CPU second without changing insertion order', () => {
    const { ctx, call } = tableRuntime();
    const id = call('table.new', ['top_right', 64, 64]);
    for (let row = 0; row < 64; row++) {
      for (let column = 0; column < 64; column++) call('table.cell', [id, column, row, `${column}:${row}`]);
    }
    const started = process.cpuUsage();
    for (let bar = 0; bar < 256; bar++) {
      for (let update = 0; update < 128; update++) call('table.cell', [id, 63, 63, `${bar}:${update}`]);
    }
    const cpu = process.cpuUsage(started);
    const table = ctx.getDrawing(String(id));
    expect(table?.type).toBe('table');
    if (table?.type !== 'table') throw new Error('Missing table');
    expect(table.cells).toHaveLength(4096);
    expect(table.cells[0]).toMatchObject({ column: 0, row: 0, text: '0:0' });
    expect(table.cells[4095]).toMatchObject({ column: 63, row: 63, text: '255:127' });
    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
      expect(cpu.user + cpu.system).toBeLessThan(1_000_000);
    }
  });
  it('retains cleared, setter-created and rolled-back cells in their stored order', () => {
    const { ctx, call } = tableRuntime();
    const id = call('table.new', ['top_right', 3, 1]);
    for (let column = 0; column < 3; column++) call('table.cell', [id, column, 0, String(column)]);
    call('table.cell', [id, 2, 0, 'updated']);
    ctx.captureRealtimeRollbackState();
    call('table.clear', [id, 0, 0, 0, 0]);
    call('table.cell', [id, 2, 0, 'after clear']);
    call('table.cell_set_text', [id, 0, 0, 'setter']);
    call('table.cell', [id, 0, 0, 'after setter']);
    const cells = () => {
      const table = ctx.getDrawing(String(id));
      if (table?.type !== 'table') throw new Error('Missing table');
      return table.cells.map(({ column, row, text }) => [column, row, text]);
    };
    expect(cells()).toEqual([
      [1, 0, '1'],
      [2, 0, 'after clear'],
      [0, 0, 'after setter'],
    ]);
    ctx.rollbackBar();
    call('table.cell', [id, 1, 0, 'after rollback']);
    expect(cells()).toEqual([
      [0, 0, '0'],
      [1, 0, 'after rollback'],
      [2, 0, 'updated'],
    ]);
    call('table.delete', [id]);
    expect(call('table.new', ['top_right', 3, 1])).toBe(id);
    call('table.cell', [id, 2, 0, 'replacement']);
    expect(cells()).toEqual([[2, 0, 'replacement']]);
  });
});
