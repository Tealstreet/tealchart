# Round 55 observations

All five exact UTF-8 sources run. Every attempt includes the native Download chart data CSV, exact source/hash, named controls, settings, Data Window and raw logs where emitted.

- Repeated missing numeric keys share one pair in this fixture: sizes 1/1, contains=1, get=23, first previous missing, second previous=11.
- The literal +0.0/-0.0 keys share one pair: both lookups return 23, the negative-key put returns 11, removal returns 23, size becomes 0 and the positive key is absent afterward. This does not establish sign preservation in arithmetic.
- Composed and decomposed Unicode keys are distinct: size=3, their values are 11/23, insertion order remains z/composed/decomposed with values 7/11/23. No source normalization was applied.
- Both numeric join versions return THIRD-POLICY for this exact fixture. Namespace and receiver agree, and the finite exact control passes. Fractional joins differ from both the written default-string candidate and the raw-JS candidate. V5 log: `namespace=0.3333333333333333|-0.1428571428571428|1.25; receiver=0.3333333333333333|-0.1428571428571428|1.25; default=0.3333333333333333|-0.14285714285714285|1.25`. V6 log: `namespace=0.3333333333333333|-0.1428571428571428|1.25; receiver=0.3333333333333333|-0.1428571428571428|1.25; default=0.3333333333|-0.1428571429|1.25`.

These are source/default-specific observations. [RESPONSE.md](RESPONSE.md) links all source-bound attempts. Terminal digits are retained in logs.txt and native.json for the receiving agent's A/B tests.
