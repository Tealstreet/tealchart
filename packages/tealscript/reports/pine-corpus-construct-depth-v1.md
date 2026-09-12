# Pine Corpus Construct Depth V1

Generated at 2026-09-11T14:12:47.581Z. Measured at commit `be88f5dc1c`.

## Headline

Across 2506 pinned corpus scripts, 71/76 construct rows are exercised by at least one script.

0 construct rows are high-use (>=100 corpus scripts) while being backed by one committed grammar snippet or none in this detector taxonomy.

0 exercised construct rows have no committed grammar snippet match here; these are mostly authoring-pattern refinements outside the 63-snippet manual inventory, not necessarily missing parser tests.

The heavily used corpus constructs are also backed by multiple grammar snippets; construct depth is healthier than member depth.

## Basis

- Grammar inventory: `PINE_V6_GRAMMAR_CONSTRUCTS from src/compat/pineV6GrammarReference.ts` (85 committed snippets).
- Corpus scripts scanned: 2506; parsed for AST-backed construct depth: 2469; parse failures: 37.
- Method: Each construct row is detected against all v5, v6, v7, and v7 size-recovered pinned sources. AST-backed rows are counted only when the local parser produces an AST; source-backed formatting/import rows also count in parse-failed files. Grammar depth is the number of committed grammar coverage snippets that trigger the same detector.
- Caveat: This measures language-form exposure, not semantic/value correctness.
- Caveat: The taxonomy includes manual-inventory rows plus authoring-pattern refinements that the manual snippets collapse together, such as collection receiver calls versus namespace calls.
- Caveat: Recursive-call detection is syntactic and direct only: it counts a UDF body calling the same name, not mutual recursion or runtime recursion depth.
- Caveat: Formatting rows are source-pattern detections and can include benign false positives; they are kept separate with basis=source.

## High-Use Thin Construct Rows

| Construct | Name | Category | Corpus scripts | Corpus hits | Grammar snippets | Basis | Samples |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Ranked Construct Depth Gaps

| Construct | Category | Corpus scripts | Corpus hits | Grammar snippets | Grammar hits | Gap score | Grammar samples |
| --- | --- | --- | --- | --- | --- | --- | --- |
| variables.multi-declaration | variables | 1903 | 45350 | 3 | 3 | 15751 | formatting.call-continuation-nested<br>variables.multi-declaration<br>variables.multi-declaration-untyped |
| operators.logical | operators | 1684 | 95664 | 2 | 8 | 12800 | operators.comparison<br>operators.logical |
| operators.history-reference | operators | 1428 | 23966 | 3 | 4 | 6467.5 | operators.drawing-receiver-method-call<br>operators.history-reference<br>operators.history-reference-expression |
| types.na-typed-initializer | types | 928 | 9831 | 2 | 2 | 5379.5 | types.na-typed-initializer<br>types.na-typed-initializer-reference |
| variables.reassignment | variables | 1560 | 55945 | 7 | 11 | 5308.77 | conditionals.else-if<br>conditionals.if-statement<br>conditionals.once<br>objects.field-assignment |
| variables.var | variables | 1507 | 23230 | 3 | 6 | 4374 | conditionals.once<br>operators.drawing-receiver-method-call<br>variables.var |
| operators.conditional | operators | 1700 | 52926 | 12 | 14 | 3922.1 | arrays.array-literal-nested<br>conditionals.switch-discriminant-parenthesized<br>conditionals.switch-expression<br>enums.declaration |
| conditionals.if-statement | conditionals | 1810 | 50768 | 14 | 16 | 3302.29 | conditionals.else-if<br>conditionals.else-if-expression<br>conditionals.if-expression<br>conditionals.if-statement |
| conditionals.else-if | conditionals | 620 | 5970 | 2 | 2 | 3295 | conditionals.else-if<br>conditionals.else-if-expression |
| arrays.array-literal | arrays-matrices-maps | 885 | 4896 | 2 | 2 | 2890.5 | arrays.array-literal<br>arrays.array-literal-nested |
| operators.member-access | operators | 2442 | 325629 | 37 | 117 | 2849.15 | arrays.array-literal<br>arrays.array-literal-nested<br>arrays.generic-new-call<br>declarations.strategy |
| operators.comparison | operators | 2052 | 97319 | 25 | 37 | 2712.32 | arrays.array-literal-nested<br>conditionals.else-if<br>conditionals.else-if-expression<br>conditionals.if-expression |
| functions.block-body | functions-methods | 1427 | 8520 | 4 | 4 | 2486.75 | formatting.doc-annotations-function-extra<br>functions.block-body<br>functions.block-body-default-parameter<br>functions.block-body-nested-tail |
| objects.field-assignment | types | 161 | 7044 | 2 | 3 | 2428.5 | objects.field-assignment<br>objects.field-assignment-nested |
| operators.arithmetic | operators | 2020 | 122416 | 29 | 55 | 2295.4 | arrays.array-literal-nested<br>declarations.library-export-function<br>formatting.doc-annotations<br>formatting.doc-annotations-function-extra |
| variables.untyped-declaration | variables | 2288 | 110706 | 44 | 54 | 2102.11 | arrays.array-literal<br>arrays.array-literal-nested<br>arrays.generic-new-call<br>conditionals.else-if |
| operators.collection-namespace-call | operators | 931 | 37862 | 13 | 19 | 2064.35 | arrays.generic-new-call<br>formatting.method-chain-continuation<br>loops.for-in-index-value<br>loops.for-in-value |
| formatting.call-continuation | formatting | 276 | 3041 | 2 | 2 | 1658.5 | formatting.call-continuation<br>formatting.call-continuation-nested |
| types.primitive-annotation | types | 1606 | 71592 | 24 | 46 | 1623.26 | declarations.library-export-function<br>formatting.doc-annotations<br>formatting.doc-annotations-function-extra<br>functions.block-body |
| variables.typed-declaration | variables | 1618 | 64666 | 23 | 45 | 1507.37 | enums.declaration<br>formatting.doc-annotations<br>formatting.doc-annotations-function-extra<br>objects.field-assignment |
| loops.for-to | loops | 624 | 3670 | 3 | 3 | 1431.33 | loops.break<br>loops.continue<br>loops.for-to |
| arrays.generic-new-call | arrays-matrices-maps | 368 | 3520 | 3 | 3 | 1296 | arrays.generic-new-call<br>types.map-template<br>types.matrix-template |
| tuples.declaration | tuples | 650 | 2711 | 3 | 3 | 1120.33 | tuples.declaration<br>tuples.discard-underscore<br>tuples.reassignment |
| types.array-shorthand | types | 558 | 4834 | 5 | 5 | 1078.4 | types.array-shorthand<br>types.array-template<br>types.object-provider-annotations<br>types.qualifier-annotations-references |
| formatting.inline-comment | formatting | 2506 | 104937 | 85 | 102 | 1058.28 | arrays.array-literal<br>arrays.array-literal-nested<br>arrays.generic-new-call<br>conditionals.else-if |
| types.array-template | types | 390 | 3457 | 4 | 4 | 961.75 | types.array-template<br>types.object-provider-annotations<br>types.qualifier-annotations-references<br>types.udt-collection-field |
| operators.collection-receiver-method-call | operators | 365 | 15768 | 13 | 19 | 857.97 | arrays.array-literal<br>arrays.array-literal-nested<br>arrays.generic-new-call<br>formatting.method-chain-continuation |
| operators.receiver-method-call | operators | 969 | 24935 | 18 | 33 | 809.44 | arrays.array-literal<br>arrays.array-literal-nested<br>arrays.generic-new-call<br>formatting.method-chain-continuation |
| conditionals.switch-discriminant | conditionals | 351 | 991 | 2 | 2 | 671 | conditionals.switch-discriminant-parenthesized<br>conditionals.switch-expression |
| declarations.strategy | declarations | 570 | 578 | 2 | 2 | 574 | declarations.strategy<br>declarations.strategy-risk-options |
| types.qualifier-annotation | types | 662 | 3876 | 5 | 9 | 563.07 | functions.block-body-default-parameter<br>functions.block-body-nested-tail<br>operators.history-reference-expression<br>types.qualifier-annotations |
| variables.assignment-plus | variables | 705 | 6334 | 11 | 13 | 551.32 | loops.break<br>loops.continue<br>loops.for-in-index-value<br>loops.for-in-value |
| types.udt-collection-field | types | 78 | 443 | 1 | 1 | 521 | types.udt-collection-field |
| operators.drawing-receiver-method-call | operators | 121 | 2596 | 3 | 6 | 473 | operators.drawing-receiver-method-call<br>types.na-typed-initializer-reference<br>types.qualifier-annotations-references |
| formatting.doc-annotations | formatting | 510 | 2668 | 2 | 15 | 432.87 | formatting.doc-annotations<br>formatting.doc-annotations-function-extra |
| variables.assignment-minus | variables | 193 | 561 | 2 | 2 | 377 | variables.assignment-minus-block<br>variables.compound-assignments |
| types.udt-annotation | types | 671 | 6837 | 10 | 23 | 364.36 | enums.declaration<br>objects.field-assignment<br>objects.field-assignment-nested<br>objects.udt-field-defaults |
| formatting.expression-continuation | formatting | 127 | 1201 | 2 | 4 | 363.75 | formatting.expression-continuation<br>formatting.expression-continuation-nested |
| loops.while | loops | 144 | 530 | 2 | 2 | 337 | loops.while<br>loops.while-break |
| functions.default-parameter | functions-methods | 193 | 474 | 2 | 2 | 333.5 | functions.block-body-default-parameter<br>functions.expression-body |
| types.matrix-template | types | 32 | 275 | 1 | 1 | 307 | types.matrix-template |
| variables.assignment-multiply | variables | 90 | 175 | 1 | 1 | 265 | variables.compound-assignments |
| conditionals.switch-condition-form | conditionals | 65 | 184 | 1 | 1 | 249 | conditionals.switch-condition-form |
| loops.break | loops | 186 | 558 | 3 | 3 | 248 | loops.break<br>loops.for-in-value-break<br>loops.while-break |
| loops.for-to-by | loops | 59 | 175 | 1 | 1 | 234 | loops.for-to-by |
| types.map-template | types | 31 | 176 | 1 | 1 | 207 | types.map-template |
| loops.for-in-value | loops | 105 | 306 | 2 | 2 | 205.5 | loops.for-in-value<br>loops.for-in-value-break |
| methods.declaration | functions-methods | 104 | 502 | 3 | 3 | 202 | methods.declaration<br>methods.exported<br>methods.overload |
| tuples.discard-underscore | tuples | 74 | 256 | 1 | 2 | 202 | tuples.discard-underscore |
| variables.varip | variables | 28 | 168 | 1 | 1 | 196 | variables.varip |
| imports.explicit-alias | imports | 118 | 216 | 2 | 2 | 167 | imports.explicit-alias<br>imports.explicit-alias-call |
| loops.continue | loops | 38 | 117 | 1 | 1 | 155 | loops.continue |
| types.nested-udt-field | types | 37 | 116 | 1 | 1 | 153 | types.nested-udt-field |
| objects.field-default | types | 73 | 755 | 5 | 6 | 140.43 | formatting.doc-annotations<br>objects.exported-udt<br>objects.field-assignment<br>objects.field-assignment-nested |
| objects.udt-declaration | types | 222 | 848 | 7 | 8 | 137.71 | formatting.doc-annotations<br>objects.exported-udt<br>objects.field-assignment<br>objects.field-assignment-nested |
| loops.for-in-index-value | loops | 39 | 87 | 1 | 1 | 126 | loops.for-in-index-value |
| imports.declaration | imports | 124 | 233 | 3 | 3 | 119 | imports.explicit-alias<br>imports.explicit-alias-call<br>imports.implicit-alias |
| conditionals.if-expression | conditionals | 64 | 150 | 2 | 2 | 107 | conditionals.else-if-expression<br>conditionals.if-expression |
| functions.expression-body | functions-methods | 207 | 777 | 10 | 12 | 85.45 | declarations.library-export-function<br>enums.exported<br>formatting.doc-annotations<br>functions.exported |
| functions.exported | functions-methods | 28 | 481 | 7 | 8 | 64.13 | declarations.library-export-function<br>enums.exported<br>formatting.doc-annotations<br>formatting.doc-annotations-function-extra |
| declarations.indicator | declarations | 1873 | 1874 | 76 | 76 | 49.3 | arrays.array-literal<br>arrays.array-literal-nested<br>arrays.generic-new-call<br>conditionals.else-if |
| objects.exported-udt | types | 11 | 76 | 2 | 2 | 43.5 | formatting.doc-annotations<br>objects.exported-udt |
| variables.assignment-divide | variables | 12 | 21 | 1 | 1 | 33 | variables.compound-assignments |
| imports.implicit-alias | imports | 11 | 13 | 1 | 1 | 24 | imports.implicit-alias |
| enums.declaration | enums | 22 | 47 | 3 | 3 | 23 | enums.declaration<br>enums.exported<br>formatting.doc-annotations |
| enums.title | enums | 12 | 77 | 3 | 5 | 19.4 | enums.declaration<br>enums.exported<br>formatting.doc-annotations |
| declarations.library | declarations | 28 | 28 | 7 | 7 | 8 | declarations.library-export-function<br>enums.exported<br>formatting.doc-annotations<br>formatting.doc-annotations-function-extra |
| tuples.reassignment | tuples | 2 | 4 | 1 | 1 | 6 | tuples.reassignment |
| conditionals.once | conditionals | 2 | 3 | 1 | 1 | 5 | conditionals.once |
| operators.bitwise | operators | 1 | 4 | 1 | 2 | 3 | operators.bitwise |
| enums.exported | enums | 1 | 1 | 2 | 2 | 1 | enums.exported<br>formatting.doc-annotations |
| formatting.method-chain-continuation | formatting | 0 | 0 | 1 | 1 | 0 | formatting.method-chain-continuation |
| formatting.triple-quoted-string | formatting | 0 | 0 | 0 | 0 | 0 |  |
| functions.recursive-call | functions-methods | 0 | 0 | 0 | 0 | 0 |  |
| methods.overload | functions-methods | 0 | 0 | 1 | 1 | 0 | methods.overload |
| variables.assignment-modulo | variables | 0 | 0 | 1 | 1 | 0 | variables.compound-assignments |

## Category Summary

| Category | Exercised | High-use thin | Unbacked |
| --- | --- | --- | --- |
| arrays-matrices-maps | 2 | 0 | 0 |
| conditionals | 6 | 0 | 0 |
| declarations | 3 | 0 | 0 |
| enums | 3 | 0 | 0 |
| formatting | 4 | 0 | 0 |
| functions-methods | 5 | 0 | 0 |
| imports | 3 | 0 | 0 |
| loops | 7 | 0 | 0 |
| operators | 11 | 0 | 0 |
| tuples | 3 | 0 | 0 |
| types | 14 | 0 | 0 |
| variables | 10 | 0 | 0 |

## Unreached Construct Rows

| Construct | Name | Category | Grammar snippets |
| --- | --- | --- | --- |
| formatting.method-chain-continuation | multi-line method-chain continuation | formatting | 1 |
| formatting.triple-quoted-string | triple-quoted string literal | formatting | 0 |
| functions.recursive-call | direct recursive UDF call | functions-methods | 0 |
| methods.overload | overload method/function declaration | functions-methods | 1 |
| variables.assignment-modulo | compound assignment %= | variables | 1 |
