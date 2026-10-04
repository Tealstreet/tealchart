# Linear percentile single-hole native question v1

Run this exact source as an indicator with at least16 bars and retain the full source SHA, outcome, CSV and chart context. INPUT_BAR_INDEX must start at0. SOURCE at bars0..6 must be [10,11,12,na,13,13,14].

At INPUT_BAR_INDEX=5, does PERCENTILE return na or13? Export RESULT_NA too (1 meansna,0 meansfinite), and preserve all first7 rows, including blanks. Report a compiler/runtime error verbatim if it refuses or halts instead. Do not infer an outcome from the engine.

This settles an uncertified engine-golden assertion retired from src/runtime/codegen/ta-classes.test.ts. The current candidate yields13 atbar5; its parent yieldedna. Neither is a native claim. Native len4/75 ascending two-hole evidence does not answer this exact len3/50 single-hole question. Existing len3/75 v8 question remains separate.
