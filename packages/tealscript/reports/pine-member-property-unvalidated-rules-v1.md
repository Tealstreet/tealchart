> Superseded by pine-member-property-unvalidated-rules-v2.md. Historical measurement only; use the superseding report for current figures.

# Pine Member Property Unvalidated Rules V1

Measurement commit: `63fd47823d`.

## Finding

The property lens is not evenly unfinished. Current known-good validation covers
`860/993` rules and leaves `133` unvalidated. Only `1` of those is stranded in
the scalar/proxy/tuple/collection filter: `ticker.kagi:string-domain`.

The Kagi block is current-branch state, not a permanent lens ceiling. On
`63fd47823d`, `ticker.kagi-two-argument-values` still fails and remains an
expected-red. On parser-lane HEAD `b9374d14b8`, the same case passes on both the
compiled and public paths with the expected all-ones outputs, and it is no
longer registered expected-red. Once that parser-lane fix lands here, the
scalar stranded count should fall from `1` to `0`.

## Buckets

| Bucket | Rules | Why unreachable today | Would another validator reach it? |
| --- | ---: | --- | --- |
| Side-effect outputs | `49` | The rule says the member creates a side effect rather than a scalar plot value. Current validation does not yet inspect alert/log/strategy side effects or all drawing setter payload deltas as rule-owned outputs. | Yes, but it is not one validator: it splits into event/log payload, strategy ledger/order/risk payload, and drawing mutation payload checks. |
| Trace/provider/host or opaque scalars | `44` | Values depend on live quotes, realtime barstate/timenow, provider feeds, footprint rows, recommendations, session calendar, pseudo-random sequences, or margin/liquidation behavior. | Mostly no without traces/provider fixtures. Some can only get shape checks, not exact known-good validation. |
| Locally constructible scalar single-target cases | `19` | No current known-good output isolates the member. These are ordinary constants/string helpers/closed-trade string accessors, not blocked by evidence. | Yes. Extra single-target cases should validate them directly. |
| Handle payload or isolated handle cases | `10` | The member returns or copies a drawing/chart-point handle; current scalar validator cannot inspect a handle value directly, and payload validation only sees emitted drawings. | Partly. Needs a handle-aware validator or isolated getter/copy cases that expose observable handle effects. |
| Collection-return payload cases | `8` | The member returns a collection (`*.all`, `str.split`, `request.security_lower_tf`) and current validation does not inspect returned collection payload ownership for these rows. | Partly. A collection-return validator or isolated collection-size/content cases can reach some; request/provider rows may remain evidence-bound. |
| Color payload/domain cases | `2` | `chart.bg_color` and `chart.fg_color` are color-valued host/context members; current color-domain validation reads emitted payload colors, not host color values. | Partly. Host-default shape can be checked locally; exact host color values remain context/trace-bound except documented default cases. |
| Blocked by current expected-red | `1` | `ticker.kagi` cannot be validated on this branch because the standalone two-argument Kagi value case still fails here. | Yes, after parser-lane Kagi fix lands on this branch. |

## Locally Constructible 19

- `math.e:enum-constant`
- `math.exp:enum-constant`
- `math.phi:enum-constant`
- `math.pi:enum-constant`
- `str.format:string-domain`
- `str.format_time:string-domain`
- `str.lower:string-domain`
- `str.match:string-domain`
- `str.repeat:string-domain`
- `str.replace:string-domain`
- `str.replace_all:string-domain`
- `str.split:string-domain`
- `str.substring:string-domain`
- `str.trim:string-domain`
- `str.upper:string-domain`
- `strategy.closedtrades.entry_comment:string-domain`
- `strategy.closedtrades.entry_id:string-domain`
- `strategy.closedtrades.exit_comment:string-domain`
- `strategy.closedtrades.exit_id:string-domain`

## Interpretation

`860/993` is not the ceiling. The cheap scalar tail is now small (`19`), and
Kagi should close after the parser-lane fix lands. The remaining larger buckets
are not missed by the existing scalar/property validators; they require new
payload/event/handle/collection validation surfaces or external provider/trace
evidence. For corpus audits, fires from the `860` validated rules can be treated
as findings; fires from the remaining buckets are leads unless they are in a
locally constructible or already externally bounded subset.
