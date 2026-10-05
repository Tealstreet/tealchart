import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from '../../tests/compat/fixtures';
import { UDT_HELPERS } from './codegen/compile';
import { copyUdtObject, createPineUdtObject } from './objects';

// Reference: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json entries14(type)/9(varip).
// Allocation guard retains independent objects/containers and the existing shallow-copy behavior.
describe('ordinary UDT creation allocation', () => {
  const perfIt = process.env.TEALSCRIPT_PERF_ASSERT === '1' ? it : it.skip;
  perfIt('avoids field-pair construction while preserving fresh containers and shallow copies', () => {
    const create = UDT_HELPERS.create;
    let emptyMetadata = 0;
    UDT_HELPERS.create = (...args) => {
      emptyMetadata++;
      return create(...args);
    };
    try {
      const result = runCompatScript(`//@version=5
indicator("526 ordinary UDT micro")
type Point
    float x
for i = 0 to 127
    point = Point.new(close + i)
plot(close, title="Value")`);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Value').values.length).toBeGreaterThan(0);
      const child = createPineUdtObject('Point', [['x', 7]]);
      const owner = createPineUdtObject('Owner', [['child', child]], ['child']);
      const copy = copyUdtObject(owner);
      expect(copy).not.toBe(owner);
      expect(copy.fields).not.toBe(owner.fields);
      expect(copy.varipFields).not.toBe(owner.varipFields);
      expect(copy.fields.get('child')).toBe(child);
      copy.fields.set('extra', 9);
      copy.varipFields.add('extra');
      expect(owner.fields.has('extra')).toBe(false);
      expect(owner.varipFields.has('extra')).toBe(false);
      expect(emptyMetadata).toBe(0);
    } finally {
      UDT_HELPERS.create = create;
    }
  });
});
