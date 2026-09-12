# Semantic Void Return Version Scope Correction v1

Date: 2026-09-12

## Verdict

No runtime or semantic behavior change was required.

The review found a wording mismatch, not a false refusal: declared-v4
`array.push()` used as a value already refuses because array mutators return
Pine `void`, and the reviewer confirmed this is valid v4 behavior. The mistake
was in `semantic-builtin-void-return-enforcement-v1.md`, which described the
void-return enforcement as v5+ without separating the pre-existing array helper
path from the newly derived 114-name v5/v6 side-effect cluster.

Corrected scope:

- Array mutator void-return inference is v4+ and remains enforced.
- The newly derived 114-name side-effect cluster is scoped to v5+ because that
  audit cited current/v5 type-system documentation for those names.
- The earlier 114 count is unchanged; the correction is only the version-scope
  description.

An explicit v4 checker guard now covers:

```pine
//@version=4
study("Array Void Mutators")
var values = array.new_float(0)
pushResult = array.push(values, close)
```

Expected diagnostic:

```text
Cannot assign result of array.push() to variable pushResult. array.push() returns no value; call it on its own line instead.
```
