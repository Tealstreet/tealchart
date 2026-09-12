# Pine Member Property Unvalidated Rules V2

Measurement commit: `2646080db3`.

## Finding

The property lens now validates `897/992` rules with `0` fires on known-good
output. V1 reported `860/993`; the denominator fell by one because
`str.split:string-domain` was an invalid property-map rule. `str.split` returns
a collection and is now validated as `collection-shape`.

The remaining `95` rules are not an unnamed gap. They split into `93`
structural or evidence-bound rules plus `2` branch/expected-red rules:

| Bucket | Rules | Status |
| --- | ---: | --- |
| Side-effect outputs | `49` | Structurally outside scalar known-good validation. These need event, ledger, log, or drawing mutation payload validators, not return-value checks. |
| Trace/provider/host or opaque scalars | `44` | No local known-good value exists. These need traces, provider fixtures, or shape-only treatment. |
| Documented-value expected-red | `1` | `chart.fg_color:color-domain` is already an expected-red; it becomes validatable when the runtime fix lands. |
| Branch-stale expected-red | `1` | `ticker.kagi:string-domain` still fails here, but passes on parser-lane HEAD `b9374d14b8`. |

## Closed Since V1

- `18` true scalar/string-domain rules now have single-output proxy vectors.
- `8` handle-shape rules now have constructed handle proxy cases or existing
  linefill getter attribution.
- `8` collection-shape rules are validated, including `*.all`,
  `request.security_lower_tf`, and corrected `str.split`.
- `1` color-domain rule, `chart.bg_color`, is validated through host-shape
  proxy output.

## Interpretation

`897/992` is the current validated lens. The corpus property audit can treat
fires from those `897` rules as validated findings. Fires from the remaining
`95` are leads or already-known reds: `93` are structurally outside known-good
return-value validation, `chart.fg_color` waits on the runtime fix, and Kagi
waits on the parser-lane two-argument fix landing on this branch.
