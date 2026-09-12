# External Pine Corpus Output Member Property Audit v2

Date: 2026-09-11
Measurement commit: `8cf06fa683963165eac87bc2dc25fa96e552fe75`
Machine-readable companion: `reports/external-pine-corpus-output-member-properties-v2.json`

This is the rule-driven companion to the reference-free output audit. It uses `pine-member-property-map-v2.json` only, and tags every fire by whether that exact `member|kind` rule has already been exercised on known-good vector or shipped-study output.

## Headline

Conservative direct-binding pass audited 1936/1936 produced-output rows. It applied 658 property rules to 559 plot/member bindings and produced 0 validated findings plus 0 unvalidated leads.

Validated findings are still output-property findings, not TradingView-trace defects. Unvalidated leads are first outings for their rule and must be source-read before promotion.

## Denominator

| Corpus | Produced-output rows |
| --- | --- |
| v5 | 855 |
| v6 | 777 |
| v7 | 304 |

## Rule Lens

| Map | Mapped members | Rules | Evaluated kinds | Known-good validated rules |
| --- | --- | --- | --- | --- |
| reports/pine-member-property-map-v2.json | 851 | 993 | numeric-domain, boolean-domain, integer-domain, nonnegative, numeric-range | 691 |

## Fire Counts

| Group | Count |
| --- | --- |
| direct plot/member bindings | 559 |
| applied rules | 658 |
| unsupported direct bindings | 10 |
| fires | 0 |
| validated findings | 0 |
| unvalidated leads | 0 |

## Fires By Kind

No member-property rule fires.

## Fires

No member-property rule fires.

## Rerun Failures

None.

## Method

- Source reports are the current daily produced-output denominators at `7c08371da1`: v5 855, v6 777, v7 304.
- Re-execution uses the same 1600-bar daily synthetic profile as the reference-free pass.
- Only visible `plot()` numeric value payloads are evaluated in this first rule-driven pass.
- A rule is applied only when the plot expression is a direct member call/name or a simple variable assigned from a direct member call/name.
- `numeric-domain` is counted as an application but cannot fire on numeric plot payloads; it is retained so the denominator reflects which direct bindings were reached by the v2 lens.
- String, collection, handle, enum, color payload, side-effect, and tuple rules remain unevaluated here unless a later corpus instrument can bind them to raw outputs without guessing.

