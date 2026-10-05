import type { BuiltinRegistry } from './registry';

import { describe, expect, it } from 'vitest';

import { ExecutionContext } from '../context';
import { Scope } from '../scope';
import { registerDrawingObjectCastBuiltins } from './drawings';

describe('table cast runtime reference admission', () => {
  it.each([false, true])('refuses a plain string matching an allocated table id, named=%s', (named) => {
    const ctx = new ExecutionContext();
    const id = 'table_table.new_0_0';
    ctx.addDrawing({
      id,
      type: 'table',
      barIndex: 0,
      position: 'top_right',
      columns: 1,
      rows: 1,
      bgcolor: null,
      frameColor: null,
      frameWidth: 0,
      borderColor: null,
      borderWidth: 0,
      cells: [],
    });
    const builtins: BuiltinRegistry = new Map();
    registerDrawingObjectCastBuiltins(builtins);
    const cast = builtins.get('table')!;
    const args = named ? [] : [id];
    const namedArgs = named ? new Map([['x', id]]) : new Map();
    expect(() => cast(args, namedArgs, ctx, new Scope(), 'cast')).toThrow('table x requires table reference');
  });
});
