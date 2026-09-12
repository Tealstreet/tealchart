> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Collection Expansion V1

Source report: `pine-value-vectors-coverage-v86.md`.

## Summary

- Added collection value vectors: 4.
- Newly value-covered documented collection members: 45.
- Total independent-oracle cases: 304.
- Compiled/public matches: 303/304.
- Expected failures: `language.collection-history-containers`.
- Unexpected failures: 0.
- Unexpected passes: 0.
- Broader builtin value coverage: 189/489, 38.65%.

## Covered Members

- `array.*`: `array.new_float`, `array.new_int`, `array.from`, `array.push`,
  `array.unshift`, `array.set`, `array.remove`, `array.insert`, `array.first`,
  `array.last`, `array.get`, `array.copy`, `array.pop`, `array.shift`,
  `array.size`, `array.clear`, `array.sum`, `array.avg`, `array.min`,
  `array.max`, `array.range`, `array.median`, `array.mode`.
- `matrix.*`: `matrix.new`, `matrix.set`, `matrix.get`, `matrix.rows`,
  `matrix.columns`, `matrix.elements_count`, `matrix.avg`, `matrix.min`,
  `matrix.max`, `matrix.trace`, `matrix.det`.
- `map.*`: `map.new`, `map.put`, `map.get`, `map.contains`, `map.remove`,
  `map.put_all`, `map.copy`, `map.keys`, `map.values`, `map.size`,
  `map.clear`.

These vectors assert concrete values after mutation sequences, rather than only
checking that collection methods bind and execute.
