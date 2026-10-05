import { expect, it } from 'vitest';

import { createPineArray } from '../../src/runtime/arrays';
import { createPineMap, getMapValue, putMapValue } from '../../src/runtime/maps';
import { createPineUdtObject } from '../../src/runtime/objects';
import { PineTableReference } from '../../src/runtime/drawings/store';
import { parse } from '../../src/parser/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { compatibilityBars, getPlot } from './fixtures';

function withRuntime(action: (ctx: import('../../src/runtime/codegen/compile').CompiledBarContext) => void) {
  const compiled = tryCompile(parse('//@version=6\nindicator("Persistence cost")\nplot(close)'));
  if (!compiled.success) throw new Error(compiled.unsupported.join('; '));
  const Base = compiled.ScriptClass;
  compiled.ScriptClass = class extends Base {
    override onBar(ctx: import('../../src/runtime/codegen/compile').CompiledBarContext) {
      super.onBar(ctx);
      if (ctx.barIndex === 0) action(ctx);
    }
  };
  const result = executeCompiled(compiled, compatibilityBars)!;
  expect(result.errors).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  return result;
}

it('skips table-reference classification for primitive persistent array values', () => {
  let primitiveChecks = 0;
  Object.defineProperty(PineTableReference, Symbol.hasInstance, {
    configurable: true,
    value(value: unknown) {
      if (value === null || typeof value !== 'object') primitiveChecks++;
      return Function.prototype[Symbol.hasInstance].call(PineTableReference, value);
    },
  });
  try {
    withRuntime((ctx) => {
      const array = createPineArray(8, 0);
      ctx.markPersistentRuntimeValue(array);
      for (let index = 0; index < 8; index++) ctx.arraySet(array, index, index + 0.25);
      expect(array.values).toEqual(Array.from({ length: 8 }, (_, index) => index + 0.25));
    });
    expect(primitiveChecks).toBe(0);
  } finally {
    Reflect.deleteProperty(PineTableReference, Symbol.hasInstance);
  }
});

it.each(['line', 'label', 'box', 'table', 'polyline'] as const)(
  'keeps %s handles persistent through array, UDT and map aliases',
  (kind) => {
    const result = withRuntime((ctx) => {
      const array = createPineArray();
      ctx.markPersistentRuntimeValue(array);
      const owner = createPineUdtObject('Owner', [['items', array]]);
      ctx.markPersistentRuntimeValue(owner);
      const map = createPineMap<string, typeof owner>();
      putMapValue(map, 'owner', owner);
      const aliased = getMapValue(map, 'owner');
      expect(aliased).toBe(owner);
      expect(owner.fields.get('items')).toBe(array);
      let handle: unknown;
      if (kind === 'line') handle = ctx.callBuiltin('line.new', [0, 10, 1, 20], undefined, kind);
      if (kind === 'label') handle = ctx.callBuiltin('label.new', [0, 10, 'retained'], undefined, kind);
      if (kind === 'box') handle = ctx.callBuiltin('box.new', [0, 20, 1, 10], undefined, kind);
      if (kind === 'table') handle = ctx.callBuiltin('table.new', ['top_right', 1, 1], undefined, kind);
      if (kind === 'polyline') {
        const first = ctx.callBuiltin('chart.point.from_index', [0, 10], undefined, 'first');
        const second = ctx.callBuiltin('chart.point.from_index', [1, 20], undefined, 'second');
        const points = createPineArray();
        points.values.push(first, second);
        handle = ctx.callBuiltin('polyline.new', [points], undefined, kind);
      }
      ctx.arrayPush(array, handle);
      expect(array.values[0]).toBe(handle);
      ctx.markPersistentUdtField(owner, 'items');
    });
    const drawings = result.drawings.filter((drawing) => drawing.type === kind);
    expect(drawings).toHaveLength(1);
    expect(drawings[0].persistent).toBe(true);
  },
);

it.each([
  ['line', 'line.new(bar_index, close, bar_index + 1, close)'],
  ['label', 'label.new(bar_index, close, "retained")'],
  ['box', 'box.new(bar_index, high, bar_index + 1, low)'],
  ['table', 'table.new(position.top_right, 1, 1)'],
  ['polyline', 'polyline.new(array.from(chart.point.from_index(bar_index, close), chart.point.from_index(bar_index + 1, close)))'],
])('retains %s handles inserted into var arrays through UDT and map aliases', (kind, constructor) => {
  const program = parse(`//@version=6
indicator("Var drawing aliases")
type Holder
    array<${kind}> items
var pool = array.new<${kind}>()
var owner = Holder.new(pool)
var registry = map.new<string, Holder>()
if barstate.isfirst
    map.put(registry, "owner", owner)
aliasedOwner = map.get(registry, "owner")
array.push(aliasedOwner.items, ${constructor})
plot(array.size(pool), "Size")`);
  const compiled = tryCompile(program);
  if (!compiled.success) throw new Error(compiled.unsupported.join('; '));
  const result = executeCompiled(compiled, compatibilityBars)!;
  expect(result.errors).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  const drawings = result.drawings.filter((drawing) => drawing.type === kind);
  expect(drawings).toHaveLength(kind === 'table' ? 1 : compatibilityBars.length);
  expect(getPlot(result, 'Size').values).toEqual(compatibilityBars.map((_, index) => index + 1));
  expect(drawings.every((drawing) => drawing.persistent)).toBe(true);
});
