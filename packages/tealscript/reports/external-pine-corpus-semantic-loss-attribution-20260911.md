# External Pine Corpus Semantic Loss Attribution 2026-09-11

Date: 2026-09-11

Scope: attribute the six output-producing rows that stopped producing output
between the `7c08371da1` daily reports and the `7ee7a2c98b` TA-length codegen
fix measurement. These six rows were unrelated to the TA-length fix but were
netted into the +29 output rebound, so they need their own attribution.

## Verdict

All six rows flipped at commit `ba1395693a`
(`test(tealscript): add semantic type invariants`).

That commit made two reference-grounded semantic changes relevant here:

- Reference/special/collection/UDT handle values now retain Pine's inherited
  `series` qualifier.
- String concatenation now infers `string`, allowing existing const-string
  checks to see series string messages instead of unknowns.

The six rows are therefore correct loud refusals, not runtime regressions and
not part of the TA-length codegen rebound.

Rule 6 independent check: confirmed. The external oracle is the TradingView v6
manual, not the parser-lane implementation that introduced the refusals.

- The type-system page defines Pine's qualifier hierarchy as
  `const < input < simple < series` and states that an accepted qualifier also
  accepts weaker qualifiers, but not stronger ones. It gives the direct example
  that a `simple int` parameter can accept `input` or `const`, but cannot accept
  `series`. A `series` value passed to a `simple` UDF parameter is therefore a
  genuine type error.
- The alerts page lists `alertcondition(condition, title, message)` with
  `message` as an optional `const string`, known at compilation time and unable
  to vary bar to bar. Dynamic `series string` alert messages belong to
  `alert()`, not `alertcondition()`.

Reference pages checked:

- https://www.tradingview.com/pine-script-docs/language/type-system/
- https://www.tradingview.com/pine-script-docs/concepts/alerts/

## Method

I built tiny v5/v6 corpus directories containing only the six affected scripts
from the cached corpus sources, then ran the real external-corpus pipeline in
detached worktrees at:

- `7c08371da1`
- `ba1395693a`
- `b530365e67`
- `987b606345`

All six produced output at `7c08371da1`. All six failed semantic analysis at
`ba1395693a`, and stayed failed at later commits.

## Rows

| Corpus | Row | Commit | Diagnostic |
| --- | --- | --- | --- |
| v5 | `sources/0289__mihakralj-pinescript__conv.pine` | `ba1395693a` | `45:29: qualifier-mismatch: Cannot pass series value to simple parameter 'kernel' for function conv; use an input/simple value or declare a compatible parameter` |
| v5 | `sources/0728__gorx1-TradingView__Quantile-BasedAdaptiveDetection.pine` | `ba1395693a` | `280:26: qualifier-mismatch: Cannot pass series value to simple parameter 'weights' for function qbad; use an input/simple value or declare a compatible parameter` |
| v6 | `sources/0242__MertYakar66-smart-wheel-engine__smart_wheel_signals.pine` | `ba1395693a` | `207:68: qualifier-mismatch: Cannot pass series string message to alertcondition(); use a const string` |
| v6 | `sources/0459__KayembaIbrahim-zentechx__indicator.pine` | `ba1395693a` | `36:11: qualifier-mismatch: Cannot pass series string message to alertcondition(); use a const string` |
| v6 | `sources/0488__Kiyoraka-TradingView-Script__magic_candle_advanced_features_v5.pine` | `ba1395693a` | `335:58: qualifier-mismatch: Cannot pass series string message to alertcondition(); use a const string` |
| v6 | `sources/0575__krram712-stock-agent__elite-v3.pine` | `ba1395693a` | `369:60: qualifier-mismatch: Cannot pass series string message to alertcondition(); use a const string` |

## Interpretation

The two v5 rows pass a series-qualified reference/collection value to a UDF
parameter declared with a stricter `simple` qualifier. Before `ba1395693a`,
those values could be inferred without the inherited `series` qualifier, so the
checker accepted calls Pine should reject.

The four v6 rows build `alertcondition()` messages from series string
expressions. Before `ba1395693a`, string concatenation could infer `unknown`,
which masked the existing title/message const-string rule. After the commit,
the checker knows the value is a `series string` and reports the documented
const-string requirement.

The +29 TA-length measurement is now fully attributed:

- 35 rows returned to output because `6c66058cf4` fixed the generated SMA
  expression-source ordering bug.
- 6 rows left output because `ba1395693a` correctly tightened semantic
  qualifier handling.
- The remaining explicit TA-length rows are the intended invalid-input
  refusals, mostly fractional lengths and literal zero.

## Request-Expression Profile Adjudication

Two request-expression profile diagnostics remain separate from this semantic
loss attribution. They did not move the output counts: both rows still produce
compiled output, all pipeline stages pass, and the only signal is
`swallowedErrors` from request-expression replay.

| Corpus | Row | Profile signal | Source shape | Disposition |
| --- | --- | --- | --- | --- |
| v5 | `sources/0865__hasnocool-tradingview-pine-scripts__John-F.-Ehlers-Center-Of-Gravity-Balanced-by-DM-.pine` | `compiled-request-expression:request.security:0`, count `1600`, first message `TA length must be a positive integer; got na` | `request.security(..., expression=fx_centerofgravitydm(), ...)` reaches a helper that derives TA lengths through an input-backed correction path. The outer strategy still produces 3 plots. | Matters. Keep on the board as a request-expression replay/context defect candidate: a visible script has a request lane reporting a Pine-facing error on every bar, so the request series may be wrong even though the row is counted as produced output. |
| v7 | `sources/0359__regalouisei-collect-tradingview__eduvest-qqe-signal-v30-multi-timeframe-scoring-system.pine` | `compiled-request-expression:request.security:5`, count `1600`, first message `TA length must be a positive integer; got 4.5` | `hma_calc(src, len)` calls `ta.wma(src, len / 2)` with default `hma_length = 9`, so the request expression computes length `4.5`. The outer indicator still produces 1 plot, 16 drawings, and 3 alerts. | Matters. This looks like a genuine invalid TA length inside a request expression, but today it is profile-only rather than a loud row failure. Follow-up should decide whether Pine runtime errors from request-expression replay must propagate to the script error list, or be exposed in a stronger machine-visible way. |

These are not evidence against the six semantic refusals above. They are a
separate request/codegen honesty issue: profile-visible request-expression
errors can coexist with produced output, which is too easy for corpus output
counts to miss.

Follow-up verdict: the large `1600` count is one Pine-facing TA-length error
repeated once per requested bar, not sixteen hundred distinct defects. The TA
length refusal is still correct inside request expressions; there is no
request-scope exception in Pine's documented positive-integer length rule. The
defect is the replay boundary: `evaluateSecuritySeries()` rethrew explicit
`CompiledRuntimeErrorException`s but treated other `isKnownPineRuntimeError()`
families, including `TA length must be a positive integer`, as generated-code
failures and recorded them in `profile.swallowedErrors`.

The runtime fix is to rethrow known Pine runtime errors from request-expression
replay, matching the ordinary compiled-bar boundary. Non-Pine generated-code
failures still return `na` for the requested bar and remain visible in
`profile.swallowedErrors`.
