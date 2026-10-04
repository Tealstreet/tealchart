# label creation-pause cadence discriminator v2

Exact source SHA256 `17cf1cfc86a437b7daebdb72cc1fdc1dc6b00154a7fe053a86669b3c06ed1fdd`. Paste separately on BINANCE:BTCUSDT standard2m UTC/default inputs. Require96historical bars including Pine BAR_INDEX0; missing prefix is CONTEXT-GAP. Export all five columns, preserve NA/precision and strict live cutoff. Save any actual compile/runtime diagnostic/code/text/line/bar and screenshot.

Successor adds shared burst/delete/pause controls to separate all four models individually; archived v1 is not a new paste. Native outcomes UNSPECIFIED, production HOLD. Models are predictions only; any other trace is a third outcome. Endpoint quotas do not identify arbitrary GC side effects.

Rules: threshold-slack5 trims after a creation when count>8 to3; creation-batch6 first trims at creation9 then each6 creations to3; bar-batch6 trims after source operations on bar8 then each6bars to3; start-bar-slack5 trims to2 before the first creation on a bar when existing count>=8. No trim is assumed at a nonexistent creation.

Each table cell is count/oldest/eighth/ninth; `NA` is an unset field. Each row is the plotted post-source observation under that hypothetical rule.

| Pine bar | threshold-slack5 | creation-batch6 | bar-batch6 | start-bar-slack5 |
|---|---|---|---|---|
| 0 | 1/0/NA/NA | 1/0/NA/NA | 1/0/NA/NA | 1/0/NA/NA |
| 1 | 2/0/NA/NA | 2/0/NA/NA | 2/0/NA/NA | 2/0/NA/NA |
| 2 | 3/0/NA/NA | 3/0/NA/NA | 3/0/NA/NA | 3/0/NA/NA |
| 3 | 4/0/NA/NA | 4/0/NA/NA | 4/0/NA/NA | 4/0/NA/NA |
| 4 | 4/0/NA/NA | 4/0/NA/NA | 4/0/NA/NA | 4/0/NA/NA |
| 5 | 4/0/NA/NA | 4/0/NA/NA | 4/0/NA/NA | 4/0/NA/NA |
| 6 | 4/0/NA/NA | 4/0/NA/NA | 4/0/NA/NA | 4/0/NA/NA |
| 7 | 4/0/NA/NA | 4/0/NA/NA | 4/0/NA/NA | 4/0/NA/NA |
| 8 | 5/0/NA/NA | 5/0/NA/NA | 3/2/NA/NA | 5/0/NA/NA |
| 9 | 6/0/NA/NA | 6/0/NA/NA | 4/2/NA/NA | 6/0/NA/NA |
| 10 | 7/0/NA/NA | 7/0/NA/NA | 5/2/NA/NA | 7/0/NA/NA |
| 11 | 8/0/NA/NA | 8/0/NA/NA | 6/2/NA/NA | 8/0/NA/NA |
| 12 | 3/10/NA/NA | 3/10/NA/NA | 7/2/NA/NA | 3/10/NA/NA |
| 13 | 4/10/NA/NA | 4/10/NA/NA | 8/2/NA/NA | 4/10/NA/NA |
| 14 | 5/10/NA/NA | 5/10/NA/NA | 3/12/NA/NA | 5/10/NA/NA |
| 15 | 6/10/NA/NA | 6/10/NA/NA | 4/12/NA/NA | 6/10/NA/NA |
| 16 | 7/10/NA/NA | 7/10/NA/NA | 5/12/NA/NA | 7/10/NA/NA |
| 17 | 8/10/NA/NA | 8/10/NA/NA | 6/12/NA/NA | 8/10/NA/NA |
| 18 | 3/16/NA/NA | 3/16/NA/NA | 7/12/NA/NA | 3/16/NA/NA |
| 19 | 4/16/NA/NA | 4/16/NA/NA | 8/12/NA/NA | 4/16/NA/NA |
| 20 | 7/20/6/7 | 7/20/6/7 | 3/20/16/17 | 13/16/12/13 |
| 21 | 8/20/6/7 | 8/20/6/7 | 4/20/16/17 | 3/20/12/13 |
| 22 | 2/21/6/7 | 2/21/6/7 | 4/20/16/17 | 3/20/12/13 |
| 23 | 3/21/6/7 | 3/21/6/7 | 5/20/16/17 | 4/20/12/13 |
| 24 | 3/21/6/7 | 3/21/6/7 | 5/20/16/17 | 4/20/12/13 |
| 25 | 3/21/6/7 | 3/21/6/7 | 5/20/16/17 | 4/20/12/13 |
| 26 | 3/21/6/7 | 3/21/6/7 | 3/21/16/17 | 4/20/12/13 |
| 27 | 3/21/6/7 | 3/21/6/7 | 3/21/16/17 | 4/20/12/13 |
| 28 | 4/21/6/7 | 4/21/6/7 | 4/21/16/17 | 5/20/12/13 |
| 29 | 5/21/6/7 | 5/21/6/7 | 5/21/16/17 | 6/20/12/13 |
| 30 | 6/21/6/7 | 6/21/6/7 | 6/21/16/17 | 7/20/12/13 |
| 31 | 7/21/6/7 | 7/21/6/7 | 7/21/16/17 | 8/20/12/13 |
| 32 | 8/21/6/7 | 3/30/6/7 | 3/30/16/17 | 3/30/12/13 |
| 33 | 3/31/6/7 | 4/30/6/7 | 4/30/16/17 | 4/30/12/13 |
| 34 | 4/31/6/7 | 5/30/6/7 | 5/30/16/17 | 5/30/12/13 |
| 35 | 5/31/6/7 | 6/30/6/7 | 6/30/16/17 | 6/30/12/13 |
| 36 | 6/31/6/7 | 7/30/6/7 | 7/30/16/17 | 7/30/12/13 |
| 37 | 7/31/6/7 | 8/30/6/7 | 8/30/16/17 | 8/30/12/13 |
| 38 | 8/31/6/7 | 3/36/6/7 | 3/36/16/17 | 3/36/12/13 |
| 39 | 3/37/6/7 | 4/36/6/7 | 4/36/16/17 | 4/36/12/13 |
| 40 | 4/37/6/7 | 5/36/6/7 | 5/36/16/17 | 5/36/12/13 |
| 41 | 5/37/6/7 | 6/36/6/7 | 6/36/16/17 | 6/36/12/13 |
| 42 | 6/37/6/7 | 7/36/6/7 | 7/36/16/17 | 7/36/12/13 |
| 43 | 7/37/6/7 | 8/36/6/7 | 8/36/16/17 | 8/36/12/13 |
| 44 | 8/37/6/7 | 3/42/6/7 | 3/42/16/17 | 3/42/12/13 |
| 45 | 3/43/6/7 | 4/42/6/7 | 4/42/16/17 | 4/42/12/13 |
| 46 | 4/43/6/7 | 5/42/6/7 | 5/42/16/17 | 5/42/12/13 |
| 47 | 5/43/6/7 | 6/42/6/7 | 6/42/16/17 | 6/42/12/13 |
| 48 | 6/43/6/7 | 7/42/6/7 | 7/42/16/17 | 7/42/12/13 |
| 49 | 7/43/6/7 | 8/42/6/7 | 8/42/16/17 | 8/42/12/13 |
| 50 | 8/43/6/7 | 3/48/6/7 | 3/48/16/17 | 3/48/12/13 |
| 51 | 3/49/6/7 | 4/48/6/7 | 4/48/16/17 | 4/48/12/13 |
| 52 | 4/49/6/7 | 5/48/6/7 | 5/48/16/17 | 5/48/12/13 |
| 53 | 5/49/6/7 | 6/48/6/7 | 6/48/16/17 | 6/48/12/13 |
| 54 | 6/49/6/7 | 7/48/6/7 | 7/48/16/17 | 7/48/12/13 |
| 55 | 7/49/6/7 | 8/48/6/7 | 8/48/16/17 | 8/48/12/13 |
| 56 | 8/49/6/7 | 3/54/6/7 | 3/54/16/17 | 3/54/12/13 |
| 57 | 3/55/6/7 | 4/54/6/7 | 4/54/16/17 | 4/54/12/13 |
| 58 | 4/55/6/7 | 5/54/6/7 | 5/54/16/17 | 5/54/12/13 |
| 59 | 5/55/6/7 | 6/54/6/7 | 6/54/16/17 | 6/54/12/13 |
| 60 | 6/55/6/7 | 7/54/6/7 | 7/54/16/17 | 7/54/12/13 |
| 61 | 7/55/6/7 | 8/54/6/7 | 8/54/16/17 | 8/54/12/13 |
| 62 | 8/55/6/7 | 3/60/6/7 | 3/60/16/17 | 3/60/12/13 |
| 63 | 3/61/6/7 | 4/60/6/7 | 4/60/16/17 | 4/60/12/13 |
| 64 | 4/61/6/7 | 5/60/6/7 | 5/60/16/17 | 5/60/12/13 |
| 65 | 5/61/6/7 | 6/60/6/7 | 6/60/16/17 | 6/60/12/13 |
| 66 | 6/61/6/7 | 7/60/6/7 | 7/60/16/17 | 7/60/12/13 |
| 67 | 7/61/6/7 | 8/60/6/7 | 8/60/16/17 | 8/60/12/13 |
| 68 | 8/61/6/7 | 3/66/6/7 | 3/66/16/17 | 3/66/12/13 |
| 69 | 3/67/6/7 | 4/66/6/7 | 4/66/16/17 | 4/66/12/13 |
| 70 | 4/67/6/7 | 5/66/6/7 | 5/66/16/17 | 5/66/12/13 |
| 71 | 5/67/6/7 | 6/66/6/7 | 6/66/16/17 | 6/66/12/13 |
| 72 | 6/67/6/7 | 7/66/6/7 | 7/66/16/17 | 7/66/12/13 |
| 73 | 7/67/6/7 | 8/66/6/7 | 8/66/16/17 | 8/66/12/13 |
| 74 | 8/67/6/7 | 3/72/6/7 | 3/72/16/17 | 3/72/12/13 |
| 75 | 3/73/6/7 | 4/72/6/7 | 4/72/16/17 | 4/72/12/13 |
| 76 | 4/73/6/7 | 5/72/6/7 | 5/72/16/17 | 5/72/12/13 |
| 77 | 5/73/6/7 | 6/72/6/7 | 6/72/16/17 | 6/72/12/13 |
| 78 | 6/73/6/7 | 7/72/6/7 | 7/72/16/17 | 7/72/12/13 |
| 79 | 7/73/6/7 | 8/72/6/7 | 8/72/16/17 | 8/72/12/13 |
| 80 | 8/73/6/7 | 3/78/6/7 | 3/78/16/17 | 3/78/12/13 |
| 81 | 3/79/6/7 | 4/78/6/7 | 4/78/16/17 | 4/78/12/13 |
| 82 | 4/79/6/7 | 5/78/6/7 | 5/78/16/17 | 5/78/12/13 |
| 83 | 5/79/6/7 | 6/78/6/7 | 6/78/16/17 | 6/78/12/13 |
| 84 | 6/79/6/7 | 7/78/6/7 | 7/78/16/17 | 7/78/12/13 |
| 85 | 7/79/6/7 | 8/78/6/7 | 8/78/16/17 | 8/78/12/13 |
| 86 | 8/79/6/7 | 3/84/6/7 | 3/84/16/17 | 3/84/12/13 |
| 87 | 3/85/6/7 | 4/84/6/7 | 4/84/16/17 | 4/84/12/13 |
| 88 | 4/85/6/7 | 5/84/6/7 | 5/84/16/17 | 5/84/12/13 |
| 89 | 5/85/6/7 | 6/84/6/7 | 6/84/16/17 | 6/84/12/13 |
| 90 | 6/85/6/7 | 7/84/6/7 | 7/84/16/17 | 7/84/12/13 |
| 91 | 7/85/6/7 | 8/84/6/7 | 8/84/16/17 | 8/84/12/13 |
| 92 | 8/85/6/7 | 3/90/6/7 | 3/90/16/17 | 3/90/12/13 |
| 93 | 3/91/6/7 | 4/90/6/7 | 4/90/16/17 | 4/90/12/13 |
| 94 | 4/91/6/7 | 5/90/6/7 | 5/90/16/17 | 5/90/12/13 |
| 95 | 5/91/6/7 | 6/90/6/7 | 6/90/16/17 | 6/90/12/13 |

First pairwise distinguishing bars: [{"rules": ["threshold-slack5", "creation-batch6"], "firstDifferentBar": 32, "left": {"bar": 32, "count": 8, "oldest": 21, "afterEight": 6, "afterNine": 7}, "right": {"bar": 32, "count": 3, "oldest": 30, "afterEight": 6, "afterNine": 7}}, {"rules": ["threshold-slack5", "bar-batch6"], "firstDifferentBar": 8, "left": {"bar": 8, "count": 5, "oldest": 0, "afterEight": null, "afterNine": null}, "right": {"bar": 8, "count": 3, "oldest": 2, "afterEight": null, "afterNine": null}}, {"rules": ["threshold-slack5", "start-bar-slack5"], "firstDifferentBar": 20, "left": {"bar": 20, "count": 7, "oldest": 20, "afterEight": 6, "afterNine": 7}, "right": {"bar": 20, "count": 13, "oldest": 16, "afterEight": 12, "afterNine": 13}}, {"rules": ["creation-batch6", "bar-batch6"], "firstDifferentBar": 8, "left": {"bar": 8, "count": 5, "oldest": 0, "afterEight": null, "afterNine": null}, "right": {"bar": 8, "count": 3, "oldest": 2, "afterEight": null, "afterNine": null}}, {"rules": ["creation-batch6", "start-bar-slack5"], "firstDifferentBar": 20, "left": {"bar": 20, "count": 7, "oldest": 20, "afterEight": 6, "afterNine": 7}, "right": {"bar": 20, "count": 13, "oldest": 16, "afterEight": 12, "afterNine": 13}}, {"rules": ["bar-batch6", "start-bar-slack5"], "firstDifferentBar": 8, "left": {"bar": 8, "count": 3, "oldest": 2, "afterEight": null, "afterNine": null}, "right": {"bar": 8, "count": 5, "oldest": 0, "afterEight": null, "afterNine": null}}]

Reply v18/captures/v18/RESPONSE-v18.md. Existing v15 quota sources stay separate; no duplicate paste.
