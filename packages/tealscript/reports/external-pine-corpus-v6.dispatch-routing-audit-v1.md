> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v6 Dispatch Routing Audit v1

Date: 2026-09-11

This audit re-measures the 168 rows from
`external-pine-corpus-v6.remaining-gap-dispatch-v1.md` at current HEAD after
today's parser/runtime/semantic parity merges. The dispatch source is still the
same pinned corpus directory:

`/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911`

The pinned rerun used:

```bash
yarn workspace @tealstreet/tealscript tsx scripts/run-pinned-external-pine-corpus.ts \
  --commit bf15e19ca160f4db877ff1e63ba1316bfe8a6875 \
  --input /Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911 \
  --output /tmp/external-pine-corpus-v6-dispatch-168-current-head.json \
  --only-script <each of the 168 dispatch rows>
```

## Result

| Classification | Rows | Notes |
| --- | ---: | --- |
| Real TealScript handoff | 13 | 8 parser, 4 semantic, 1 runtime. |
| Already fixed at current HEAD | 24 | The stale dispatch ratio is 24/168, roughly one in seven. |
| Trace/request/host-required | 18 | All are already present in `PINE_TRACE_REQUIRED_v2.md`. |
| Host-library source required | 5 | Third-party imports not supplied by the host registry; not implementation-owned without source. |
| Corpus/chart/output artifact | 60 | Data-gated/no-output rows, script-authored runtime refusals, byte/prose corpus artifacts. |
| Invalid Pine by declared version | 48 | Rejected against each row's declared v5/v6 version, not v6 uniformly. |

Current runner buckets before manual audit were:

| Runner bucket | Rows |
| --- | ---: |
| `supported` | 24 |
| `tealscript-gap` | 137 |
| `unsupported-by-design` | 5 |
| `invalid-pine` | 2 |

## Already Fixed At HEAD

These old dispatch rows now pass the pinned runner at
`bf15e19ca160f4db877ff1e63ba1316bfe8a6875`:

`0097`, `0144`, `0293`, `0299`, `0310`, `0382`, `0442`, `0520`, `0569`,
`0817`, `0822`, `0823`, `0825`, `0846`, `0858`, `0872`, `0885`, `0889`,
`0935`, `0936`, `0956`, `0969`, `0975`, `1000`.

Important stale handoffs removed by this rerun:

| Row | Previous construct | Current result |
| --- | --- | --- |
| `0310` | `for` expression declaration binding | Fixed. |
| `0846` | `chart.point.price` field typing | Fixed. |
| `1000` | Exported const color expression in library | Fixed; correctly silent because the library declares no chart output. |

## Real Handoffs

### Parser-Owned

| Rows | Construct | Why parser owns it | Minimal repro |
| --- | --- | --- | --- |
| `0270`, `0302`, `0469`, `0556`, `0616`, `0982`, `0988` | Continuation-wrapped quoted strings | The parse fails before semantic/runtime on newline inside a quoted string continued onto an indented line. These are declared v5/v6 sources, including published TradingView library sources, so route as grammar/string-continuation coverage rather than semantic. | `//@version=6\nindicator("x")\nmsg = "first\n  \\nsecond"\nplot(close)` |
| `0410` | Comma-chained assignment followed by a `for` block in an indented block | The parser treats `copy = values.new(...),` as an unfinished assignment and rejects the following `for`. `packages/tealscript/CLAUDE.md` already names comma-chained declarations/statements as public corpus grammar coverage, so this belongs to parser/block-boundary handling. | `//@version=5\nindicator("x")\nif barstate.islast\n    x = 0,\n    for i = 0 to 1\n        x += i\nplot(close)` |

### Semantic-Owned

| Row | Construct | Why semantic owns it | Minimal repro |
| --- | --- | --- | --- |
| `0129` | Receiver method `table.cell(...)` with named style args | Namespace `table.cell()` accepts `text_color`; the method form `t.cell(...)` reaches execution and rejects the same named argument as unknown. This is receiver-method builtin binding/argument metadata, not parsing. | `//@version=6\nindicator("x")\nvar t = table.new(position.top_right, 1, 1)\nif barstate.islast\n    t.cell(0, 0, "x", text_color=color.white)` |
| `0483` | Official import `TradingView/TechnicalRating/1` | The source uses TradingView's official library namespace. TealScript has no implementation/registry entry for that official library version. | `//@version=5\nindicator("x")\nimport TradingView/TechnicalRating/1 as TVtr\nplot(close)` |
| `0985` | Official import `TradingView/RelativeValue/3` | Same official-library registry surface as `0483`; this is not a third-party host-library miss. | `//@version=6\nindicator("x")\nimport TradingView/RelativeValue/3 as TVrv\nplot(close)` |
| `0983` | Official `TradingView/ta/9` `ta.ichimoku()` default-argument surface | The source is a TradingView library (`//@version=6`, `library("TechnicalRating")`, copyright TradingView) importing `TradingView/ta/9` and calling `ta.ichimoku()` with no arguments. TealScript resolves a local official library function but requires three arguments, so route to official-library semantic signatures/defaults. | `//@version=6\nindicator("x")\nimport TradingView/ta/9 as tvta\n[con, base, lead1, lead2, chikou] = tvta.ichimoku()\nplot(con)` |

### Runtime-Owned

| Row | Construct | Why runtime owns it | Minimal repro |
| --- | --- | --- | --- |
| `0363` | Declared-v5 `request.security()` inside a global ternary expression | The source has global `request.security()` calls and two global ternaries selecting optional unchanged-issues data. TealScript executes the ternary branch as a local-scope request and raises the dynamic-request guard. This is a request execution/lazy-branch runtime classification issue, not parser or semantic. | `//@version=5\nindicator("x")\nuseExtra = input.bool(true)\nx = useExtra ? request.security("AAPL", timeframe.period, close) : 0.0\nplot(x)` |

## Trace/Register Cross-Check

The current rerun still contains the same 18 trace/request/host-required v6
rows, all already recorded in `PINE_TRACE_REQUIRED_v2.md`:

| Surface | Rows | Register status |
| --- | --- | --- |
| `strategy(calc_on_order_fills=true)` | `0712`, `0718`, `0746`, `0783`, `0894`, `0897`, `0966` | Present. |
| `strategy(fill_orders_on_standard_ohlc=true)` | `0706`, `0710`, `0745`, `0772`, `0773`, `0821` | Present. |
| `strategy(risk_free_rate=...)` report metrics | `0758`, `0901` | Present. |
| `request.security_lower_tf()` invalid/equal/higher timeframe context | `0266`, `0615`, `0849` | Present. |

No `PINE_TRACE_REQUIRED_v2.md` update is needed for this rerun.

The five third-party host-library rows remain unsupported-by-design until the
host supplies source for the imported library versions: `0335`, `0357`, `0485`,
`0551`, `0642`.

## Not-Ours Buckets

| Bucket | Rows | Row ids |
| --- | ---: | --- |
| Data-gated/conditional output not triggered | 34 | `0219`, `0231`, `0339`, `0367`, `0473`, `0491`, `0547`, `0568`, `0577`, `0578`, `0623`, `0699`, `0717`, `0719`, `0731`, `0767`, `0807`, `0809`, `0819`, `0855`, `0880`, `0917`, `0919`, `0922`, `0923`, `0924`, `0926`, `0927`, `0928`, `0946`, `0951`, `0965`, `0981`, `0984` |
| Global output declared but not evaluated by the runner | 6 | `0251`, `0276`, `0329`, `0331`, `0394`, `0609` |
| Script-authored runtime refusal or intentional impossible runtime state | 9 | `0168`, `0202`, `0358`, `0408`, `0415`, `0636`, `0645`, `0670`, `0680` |
| Corpus prose/byte artifact | 11 | `0188`, `0189`, `0461`, `0562`, `0990`, `0991`, `0992`, `0993`, `0994`, `0995`, `0999` |
| Invalid parse syntax by declared version | 7 | `0423`, `0496`, `0845`, `0883`, `0910`, `0912`, `0996` |
| Invalid semantic construct by declared version | 41 | `0085`, `0086`, `0087`, `0117`, `0163`, `0181`, `0185`, `0193`, `0194`, `0208`, `0223`, `0281`, `0284`, `0332`, `0336`, `0343`, `0376`, `0422`, `0434`, `0436`, `0440`, `0486`, `0512`, `0560`, `0585`, `0596`, `0617`, `0621`, `0628`, `0631`, `0648`, `0674`, `0728`, `0737`, `0742`, `0816`, `0848`, `0903`, `0908`, `0931`, `0977` |

`0816` remains not-ours: against declared v6, `strategy(contract_size=...)` is
not a supported declaration argument. Quantity sizing belongs to the documented
`default_qty_type`/`default_qty_value` and order `qty` surfaces.
