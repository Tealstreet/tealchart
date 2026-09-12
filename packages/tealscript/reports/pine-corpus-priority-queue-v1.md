# Pine Corpus Priority Queue V1

Authoritative corpus priority route: start here when asking what corpus-driven
Pine parity evidence to build next. This report synthesizes the member-depth,
optional argument-slot, and construct-depth rankings; the component reports
remain measurements, but this is the actionable queue.

Generated at 2026-09-11T14:12:53.059Z. Measured at commit `be88f5dc1c`.

## Related Entry Points

- Overall parity state and operating rules: `../PINE_PARITY_STATE.md`
- Corpus acceptance and reconstruction: `../PINE_CORPUS_BRIEFING.md`
- TradingView-terminal work: `pine-tradingview-terminal-queue-v1.md`
- Rule 6 external-oracle register: `pine-rule6-backward-audit-v8.md`

## Headline

0 targets hit all three axes: high-use thin member, corpus-exercised untested optional slots, and related high-use thin constructs.

10 targets hit at least two axes. The ranked table is score-ordered; multi-axis rows get an explicit overlap multiplier because they are where one vector/parser case can pay twice or three times.

The three axes mostly do not overlap; prioritize by score within each single axis.

## Scoring

- Member points: corpusScriptCount + 0.10 * corpusCallSiteCount/referenceCount for high-use thin member rows.
- Slot points: For corpus-exercised untested optional slots on the same surface: scriptCount + 0.05 * hitCount, multiplied by 1.25 when the slot is in the 75-slot >=25-script priority set.
- Construct points: For related high-use thin constructs: corpusScriptCount + 0.025 * corpusHitCount, multiplied by 1.5 when the construct has zero grammar snippets.
- Overlap multiplier: Multiply the sum by 1 + 0.25 * (axisCount - 1), so two-axis and three-axis targets outrank equally exposed single-axis rows.
- Construct linking: Construct links are conservative namespace/form heuristics: input surfaces link to declaration/qualifier rows, strategy surfaces to strategy declaration, drawing namespaces to drawing receiver/UDT field assignment, array/map/matrix to collection/history forms, TA/source series to history-reference, and visual/output calls to call-continuation.

## Source Reports

- Member depth: `pine-corpus-vector-depth-gap-v1.json`, commit `abc1114cbe`, 96 high-use thin members.
- Optional argument usage: `pine-corpus-optional-argument-usage-v1.json`, commit `1b35f646e3`, 75 high-use slots at >=25 scripts, 197 corpus-exercised untested slots total.
- Construct depth: `pine-corpus-construct-depth-v1.json`, commit `be88f5dc1c`, 0 high-use thin constructs.

## Triple-Axis Targets

No target hits all three axes.

## Ranked Queue

| Rank | Target | Kind | Axes | Score | Member | Slots | Constructs | Top slots | Thin constructs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | color.new | surface | member-depth | 2745.1 | 2745.1 | 0 | 0 |  |  |
| 2 | input | surface | member-depth, argument-slots | 2555.16 | 784.9 | 1259.22 | 0 | input:title (350)<br>input:group (116)<br>input:inline (83)<br>input:tooltip (38)<br>input:display (17)<br>input:active (5) |  |
| 3 | label.new | surface | argument-slots | 2508.91 | 0 | 2508.91 | 0 | label.new:style (601)<br>label.new:textcolor (589)<br>label.new:xloc (197)<br>label.new:tooltip (137)<br>label.new:textalign (86)<br>label.new:force_overlay (34) |  |
| 4 | input.bool | surface | argument-slots | 2486.41 | 0 | 2486.41 | 0 | input.bool:group (612)<br>input.bool:tooltip (345)<br>input.bool:inline (227)<br>input.bool:display (31)<br>input.bool:active (17)<br>input.bool:confirm (3) |  |
| 5 | input.int | surface | argument-slots | 2361.16 | 0 | 2361.16 | 0 | input.int:group (656)<br>input.int:tooltip (468)<br>input.int:inline (206)<br>input.int:display (54)<br>input.int:active (27)<br>input.int:confirm (2) |  |
| 6 | strategy | surface | argument-slots | 1981.36 | 0 | 1981.36 | 0 | strategy:overlay (526)<br>strategy:slippage (200)<br>strategy:shorttitle (143)<br>strategy:margin_long (116)<br>strategy:margin_short (113)<br>strategy:calc_on_every_tick (90) |  |
| 7 | color | surface | member-depth | 1901.9 | 1901.9 | 0 | 0 |  |  |
| 8 | strategy.exit | surface | member-depth, argument-slots | 1861.5 | 471.1 | 1018.1 | 0 | strategy.exit:stop (316)<br>strategy.exit:comment (95)<br>strategy.exit:loss (79)<br>strategy.exit:profit (79)<br>strategy.exit:qty_percent (32)<br>strategy.exit:comment_loss (23) |  |
| 9 | input.string | surface | argument-slots | 1641.66 | 0 | 1641.66 | 0 | input.string:group (514)<br>input.string:tooltip (238)<br>input.string:inline (184)<br>input.string:display (45)<br>input.string:active (27)<br>input.string:confirm (3) |  |
| 10 | input.float | surface | argument-slots | 1608.51 | 0 | 1608.51 | 0 | input.float:group (512)<br>input.float:tooltip (299)<br>input.float:inline (117)<br>input.float:display (29)<br>input.float:active (14)<br>input.float:confirm (2) |  |
| 11 | array.get | surface | member-depth | 1483.2 | 1483.2 | 0 | 0 |  |  |
| 12 | color.white | surface | member-depth | 1377.6 | 1377.6 | 0 | 0 |  |  |
| 13 | math.max | surface | member-depth | 1366.9 | 1366.9 | 0 | 0 |  |  |
| 14 | input.color | surface | argument-slots | 1161.55 | 0 | 1161.55 | 0 | input.color:group (344)<br>input.color:inline (206)<br>input.color:tooltip (65)<br>input.color:display (24)<br>input.color:active (13)<br>input.color:confirm (2) |  |
| 15 | color.green | surface | member-depth | 1119.8 | 1119.8 | 0 | 0 |  |  |
| 16 | math.abs | surface | member-depth | 1093.4 | 1093.4 | 0 | 0 |  |  |
| 17 | plotshape | surface | member-depth, argument-slots | 1077.94 | 815.8 | 46.55 | 0 | plotshape:display (23)<br>plotshape:editable (15) |  |
| 18 | math.min | surface | member-depth | 1070.5 | 1070.5 | 0 | 0 |  |  |
| 19 | bgcolor | surface | member-depth, argument-slots | 1034.69 | 800.2 | 27.55 | 0 | bgcolor:offset (13)<br>bgcolor:transp (13) |  |
| 20 | color.gray | surface | member-depth | 1034.3 | 1034.3 | 0 | 0 |  |  |
| 21 | array.new | surface | member-depth, argument-slots | 978.08 | 508.9 | 273.56 | 0 | array.new:size (112)<br>array.new:initial_value (61) |  |
| 22 | ta.sma | surface | member-depth | 962.7 | 962.7 | 0 | 0 |  |  |
| 23 | color.yellow | surface | member-depth | 920.9 | 920.9 | 0 | 0 |  |  |
| 24 | ta.ema | surface | member-depth | 893.3 | 893.3 | 0 | 0 |  |  |
| 25 | array.size | surface | member-depth | 871.4 | 871.4 | 0 | 0 |  |  |
| 26 | array.push | surface | member-depth | 861.5 | 861.5 | 0 | 0 |  |  |
| 27 | box.new | surface | argument-slots | 844.32 | 0 | 844.32 | 0 | box.new:bgcolor (224)<br>box.new:xloc (104)<br>box.new:text (74)<br>box.new:text_color (73)<br>box.new:text_halign (51)<br>box.new:text_valign (42) |  |
| 28 | alertcondition | surface | member-depth | 711.3 | 711.3 | 0 | 0 |  |  |
| 29 | ta.atr | surface | member-depth | 693.1 | 693.1 | 0 | 0 |  |  |
| 30 | fill | surface | member-depth, argument-slots | 615.13 | 465.8 | 26.3 | 0 | fill:display (24) |  |
| 31 | ta.highest | surface | member-depth | 597.5 | 597.5 | 0 | 0 |  |  |
| 32 | color.orange | surface | member-depth | 585.8 | 585.8 | 0 | 0 |  |  |
| 33 | array.set | surface | member-depth | 580.5 | 580.5 | 0 | 0 |  |  |
| 34 | math.round | surface | member-depth | 571.3 | 571.3 | 0 | 0 |  |  |
| 35 | ta.lowest | surface | member-depth | 548.2 | 548.2 | 0 | 0 |  |  |
| 36 | ta.crossover | surface | member-depth | 534.8 | 534.8 | 0 | 0 |  |  |
| 37 | label.style_label_down | surface | member-depth | 512 | 512 | 0 | 0 |  |  |
| 38 | ta.crossunder | surface | member-depth | 500.5 | 500.5 | 0 | 0 |  |  |
| 39 | runtime.error | surface | member-depth | 497 | 497 | 0 | 0 |  |  |
| 40 | color.black | surface | member-depth | 481.9 | 481.9 | 0 | 0 |  |  |
| 41 | syminfo.mintick | surface | member-depth | 465.4 | 465.4 | 0 | 0 |  |  |
| 42 | strategy.close_all | surface | member-depth, argument-slots | 449.8 | 170.9 | 188.94 | 0 | strategy.close_all:comment (132)<br>strategy.close_all:immediately (9)<br>strategy.close_all:alert_message (3) |  |
| 43 | timeframe.in_seconds | surface | member-depth, argument-slots | 440.41 | 198.2 | 154.13 | 0 | timeframe.in_seconds:timeframe (106) |  |
| 44 | barstate.isconfirmed | surface | member-depth | 390.1 | 390.1 | 0 | 0 |  |  |
| 45 | line.delete | surface | member-depth | 390.1 | 390.1 | 0 | 0 |  |  |
| 46 | label.delete | surface | member-depth | 381.8 | 381.8 | 0 | 0 |  |  |
| 47 | color.lime | surface | member-depth | 381.2 | 381.2 | 0 | 0 |  |  |
| 48 | ta.rsi | surface | member-depth | 377.8 | 377.8 | 0 | 0 |  |  |
| 49 | shape.triangledown | surface | member-depth | 374.8 | 374.8 | 0 | 0 |  |  |
| 50 | input.timeframe | surface | argument-slots | 361.15 | 0 | 361.15 | 0 | input.timeframe:group (149)<br>input.timeframe:tooltip (48)<br>input.timeframe:inline (47)<br>input.timeframe:active (12)<br>input.timeframe:display (4) |  |

## Low-Return Construct Negatives

These are the construct rows that the 2,506-script corpus did not reach. They are useful precisely because they should not displace exposed work tomorrow.

| Construct | Name | Corpus scripts | Grammar snippets |
| --- | --- | --- | --- |
| formatting.method-chain-continuation | multi-line method-chain continuation | 0 | 1 |
| formatting.triple-quoted-string | triple-quoted string literal | 0 | 0 |
| functions.recursive-call | direct recursive UDF call | 0 | 0 |
| methods.overload | overload method/function declaration | 0 | 1 |
| variables.assignment-modulo | compound assignment %= | 0 | 1 |
