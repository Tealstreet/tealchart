# TealScript External Pine Corpus v1 Prediction

Written before running `pine:external-corpus` on the acquired corpus.

Corpus acquisition summary known before execution:
- 220 distinct scripts
- 22 source repositories
- Declaration mix: 116 indicator, 78 study, 26 strategy
- Version mix: v2 1, v3 22, v4 63, v5 121, v6 13

Predicted funnel:
- Parse: 55%
- Semantic/typecheck: 32%
- Compile without fallback: 20%
- Execute by either compiled or interpreter fallback: 25%
- Produce visible output: 22%

Expectation: real-world v4/v5 idioms and unsupported signatures will dominate failures. Parse is the prediction I am most likely overestimating because public scripts often include formatting, old syntax, or prose wrappers our self-authored fixtures do not cover.
