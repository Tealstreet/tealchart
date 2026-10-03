# Drawing future-index historical anchor capture v1

Capture both scripts unchanged on a chart with at least600 historical bars. Record the first visible error and its full bar index, or RUNS and the three output series. Preserve the loaded first/last index.

`first-local` creates a first-bar line at bar_index+501. `first-last` creates a first-bar line at last_bar_index+501. Both calls occur only on the first bar. Current FAQ prose says500 future bars relative to the drawing bar; v3 drawing01 runs until a late historical error despite a perbar+501 call. These controls distinguish the interpretations without choosing a native result beforehand.

Do not treat absent historical CSV output after a runtime error as proof of which earlier bar executed; preserve the diagnostic bar and chart metadata. No renderer pixels or exactGC limits are tested.
