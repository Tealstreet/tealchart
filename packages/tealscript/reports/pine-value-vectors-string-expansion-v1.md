> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors String Expansion V1

Source report: `pine-value-vectors-coverage-v85.md`.

## Summary

- Added string value vectors: 13.
- Newly value-covered documented string members: 13.
- Total independent-oracle cases: 300.
- Compiled/public matches: 299/300.
- Expected failures: `language.collection-history-containers`.
- Unexpected failures: 0.
- Unexpected passes: 0.
- Broader builtin value coverage: 144/489, 29.45%.

## New Members

`str.endswith`, `str.format`, `str.format_time`, `str.lower`, `str.match`,
`str.repeat`, `str.replace`, `str.replace_all`, `str.split`, `str.substring`,
`str.tostring`, `str.trim`, and `str.upper`.

These vectors route string results through numeric equality plots. That keeps
the same output comparator while still asserting concrete string behaviour.
