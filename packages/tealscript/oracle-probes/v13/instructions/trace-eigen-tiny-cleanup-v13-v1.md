# Silent audit eigen-tiny-cleanup v13 v1

Compile this exact indicator-only source unchanged in TradingView Pine v6. Record COMPILE-ERROR, RUNTIME-ERROR, or RUNS separately. On refusal preserve exact full diagnostic/runtime text, line/column or bar, source hash, chart symbol/timeframe, loaded bar count and screenshot. Do not rewrite a refused source to get a CSV. On RUNS export every named plot with historical rows; retain the unmodified CSV and capture screenshot. Record source hash and chart metadata. Native phase/value are UNOBSERVED; local engine results below are hypotheses, not expected native truth.

Capture at least8historicalbars, all4phases repeated. Preserve raw EIGEN and scaled columns: scaling inside Pine prevents CSV formatting from making a tiny retained value appear zero. Record ordering too; compare eigenvalue multiset to supplied diagonal only as a mathematical discriminator, not predetermined native truth. Boundary1e-10 and2e-10 distinguish inclusive cleanup.
