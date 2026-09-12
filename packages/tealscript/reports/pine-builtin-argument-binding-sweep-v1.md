# Pine Builtin Argument Binding Sweep v1

Generated at: 2026-09-12T06:01:49.861Z

## Scope

- Signature source: `packages/tealscript/src/compat/pineV6BuiltinSignatures.ts`
- Checker entrypoint: `packages/tealscript/src/semantic/checker.ts checkProgram()`
- Pine version: v6 reference signature table.
- Binding diagnostics counted: `argument-count`, `argument-order`, `duplicate-argument`, `unknown-argument`, `invalid-overload`.

This sweep probes binding mechanics only. It counts required-argument refusals, named binding, positional-then-named binding, builtin named-prefix positional tails, finite-arity overruns, and distinctive named parameters on overloads. It does not infer optional default values from silence: optional slots without an explicit default oracle are reported as unprobed rather than assumed correct.

## Summary

| Metric | Count |
| --- | ---: |
| Signatures swept | 372 |
| Binding probes run | 1453 |
| Passed binding probes | 1453 |
| Failed binding probes | 0 |
| Signatures with binding failures | 0 |
| Optional slots without documented-default oracle | 510 |
| Unprobed rows | 119 |

## Verdict

No binding-rule failures were found in the derived sweep. Required arguments refuse when missing, named arguments bind, positional-then-named forms bind, positional-after-named forms reject, and finite-arity overruns reject for the probed builtin signatures.

Optional default *values* remain outside this sweep unless a separate documented-default oracle exists. The signature table tells us which slots are optional; it does not encode the default value TradingView uses.

## Cause Summary

None.

## Failure Clusters

By kind:

```json
{}
```

By namespace:

```json
{}
```

## Failures

None.

## Unprobed Optional Defaults

By kind:

```json
{
  "optional-omission": 119
}
```

- array.binary_search: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.binary_search_leftmost: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.binary_search_rightmost: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.covariance: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.fill: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.from: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.join: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.max: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.min: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.new: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.new_bool: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.new_box: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.new_chart_point: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.new_color: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.new_float: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.new_int: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.new_label: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.new_line: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.new_linefill: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.new_polyline: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.new_string: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.new_table: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.sort: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.sort_indices: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.stdev: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- array.variance: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- barcolor: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- bgcolor: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- box.new: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- chart.point.now: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- color.rgb: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- fill: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- hline: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- input: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- input.bool: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- input.color: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- input.enum: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- input.float: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- input.int: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- input.price: The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.
- ... 79 more optional-default rows in JSON.
