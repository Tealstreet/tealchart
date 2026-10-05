import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const captures = [
  {
    name: "drawing-cadence-label-delete-once-v2.pine",
    sourceSha256: "c9ed22814060e5787305f32006bf85d3ac4fc5972a0621a4a06f9ab32a6dd13b",
    csvSha256: "f6f45ce349e5e08311b9e6af00ff9e674c2aa658d13538b82850a172c4ba6c99",
    source: `//@version=6
indicator("Cadence label delete-once discriminator v2", max_labels_count=3)
var int afterEight = na
var int afterNine = na
int creations = bar_index == 20 ? 9 : bar_index >= 24 and bar_index < 28 ? 0 : 1
if creations > 0
    for i = 0 to creations - 1
        label.new(bar_index, 1)
        if i == 7
            afterEight := array.size(label.all)
        if i == 8
            afterNine := array.size(label.all)
if bar_index == 22 or bar_index == 2
    if array.size(label.all) > 0
        label.delete(array.get(label.all, 0))
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(array.size(label.all), "VISIBLE_COUNT", display=display.data_window)
plot(array.size(label.all) > 0 ? label.get_x(array.get(label.all, 0)) : na, "OLDEST_INDEX", display=display.data_window)
plot(afterEight, "AFTER_EIGHT", display=display.data_window)
plot(afterNine, "AFTER_NINE", display=display.data_window)
`,
    expected: [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95],
      [1, 2, 2, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 4, 5, 5, 6, 6, 6, 6, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8],
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 7, 7, 7, 7, 7, 7, 13, 13, 13, 13, 13, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 28, 28, 28, 28, 28, 28, 34, 34, 34, 34, 34, 34, 40, 40, 40, 40, 40, 40, 46, 46, 46, 46, 46, 46, 52, 52, 52, 52, 52, 52, 58, 58, 58, 58, 58, 58, 64, 64, 64, 64, 64, 64, 70, 70, 70, 70, 70, 70, 76, 76, 76, 76, 76, 76, 82, 82, 82, 82, 82, 82, 88, 88, 88, 88, 88, 88],
      [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
    ],
  },
  {
    name: "drawing-cadence-label-creation-pause-v2.pine",
    sourceSha256: "17cf1cfc86a437b7daebdb72cc1fdc1dc6b00154a7fe053a86669b3c06ed1fdd",
    csvSha256: "c4946d075635feedef90680c1fb567307b6af3172032f65c4f6add426555ae44",
    source: `//@version=6
indicator("Cadence label creation-pause discriminator v2", max_labels_count=3)
var int afterEight = na
var int afterNine = na
int creations = bar_index == 20 ? 9 : bar_index >= 24 and bar_index < 28 ? 0 : bar_index < 4 or bar_index >= 8 ? 1 : 0
if creations > 0
    for i = 0 to creations - 1
        label.new(bar_index, 1)
        if i == 7
            afterEight := array.size(label.all)
        if i == 8
            afterNine := array.size(label.all)
if bar_index == 22
    if array.size(label.all) > 0
        label.delete(array.get(label.all, 0))
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(array.size(label.all), "VISIBLE_COUNT", display=display.data_window)
plot(array.size(label.all) > 0 ? label.get_x(array.get(label.all, 0)) : na, "OLDEST_INDEX", display=display.data_window)
plot(afterEight, "AFTER_EIGHT", display=display.data_window)
plot(afterNine, "AFTER_NINE", display=display.data_window)
`,
    expected: [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95],
      [1, 2, 3, 4, 4, 4, 4, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 7, 8, 2, 3, 3, 3, 3, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 16, 16, 20, 20, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 31, 31, 31, 31, 31, 31, 37, 37, 37, 37, 37, 37, 43, 43, 43, 43, 43, 43, 49, 49, 49, 49, 49, 49, 55, 55, 55, 55, 55, 55, 61, 61, 61, 61, 61, 61, 67, 67, 67, 67, 67, 67, 73, 73, 73, 73, 73, 73, 79, 79, 79, 79, 79, 79, 85, 85, 85, 85, 85, 85, 91, 91, 91],
      [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
      [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7]
    ],
  },
  {
    name: "drawing-cadence-label-same-bar-burst-v2.pine",
    sourceSha256: "6962a4e70bde585b653e154365615898c1f94922ccd280e1eb035546bdf526a9",
    csvSha256: "a2eefde151394632c3a1695f78cd2f16a98804060d13819dcf76ef4137ce38e0",
    source: `//@version=6
indicator("Cadence label same-bar-burst discriminator v2", max_labels_count=3)
var int afterEight = na
var int afterNine = na
int creations = bar_index == 0 ? 9 : bar_index >= 4 and not (bar_index >= 8 and bar_index < 12) ? 1 : 0
if creations > 0
    for i = 0 to creations - 1
        label.new(bar_index, 1)
        if i == 7
            afterEight := array.size(label.all)
        if i == 8
            afterNine := array.size(label.all)
if bar_index == 6
    if array.size(label.all) > 0
        label.delete(array.get(label.all, 0))
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(array.size(label.all), "VISIBLE_COUNT", display=display.data_window)
plot(array.size(label.all) > 0 ? label.get_x(array.get(label.all, 0)) : na, "OLDEST_INDEX", display=display.data_window)
plot(afterEight, "AFTER_EIGHT", display=display.data_window)
plot(afterNine, "AFTER_NINE", display=display.data_window)
`,
    expected: [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95],
      [3, 3, 3, 3, 4, 5, 5, 6, 6, 6, 6, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 12, 12, 12, 12, 12, 18, 18, 18, 18, 18, 18, 24, 24, 24, 24, 24, 24, 30, 30, 30, 30, 30, 30, 36, 36, 36, 36, 36, 36, 42, 42, 42, 42, 42, 42, 48, 48, 48, 48, 48, 48, 54, 54, 54, 54, 54, 54, 60, 60, 60, 60, 60, 60, 66, 66, 66, 66, 66, 66, 72, 72, 72, 72, 72, 72, 78, 78, 78, 78, 78, 78, 84, 84, 84, 84, 84, 84, 90, 90, 90, 90],
      [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
      [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
    ],
  },
  {
    name: "drawing-cadence-line-delete-once-v2.pine",
    sourceSha256: "a98d00af7411825d183cdc98164ed1661cf09ac69d2e51f309696ee22ae8c374",
    csvSha256: "5e1c651a821b16bbddf1b0c1b28f653fb78d95cb541dc5df52280050aa4f9b5a",
    source: `//@version=6
indicator("Cadence line delete-once discriminator v2", max_lines_count=3)
var int afterEight = na
var int afterNine = na
int creations = bar_index == 20 ? 9 : bar_index >= 24 and bar_index < 28 ? 0 : 1
if creations > 0
    for i = 0 to creations - 1
        line.new(bar_index, 1, bar_index + 1, 2)
        if i == 7
            afterEight := array.size(line.all)
        if i == 8
            afterNine := array.size(line.all)
if bar_index == 22 or bar_index == 2
    if array.size(line.all) > 0
        line.delete(array.get(line.all, 0))
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(array.size(line.all), "VISIBLE_COUNT", display=display.data_window)
plot(array.size(line.all) > 0 ? line.get_x1(array.get(line.all, 0)) : na, "OLDEST_INDEX", display=display.data_window)
plot(afterEight, "AFTER_EIGHT", display=display.data_window)
plot(afterNine, "AFTER_NINE", display=display.data_window)
`,
    expected: [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95],
      [1, 2, 2, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 4, 5, 5, 6, 6, 6, 6, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8],
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 7, 7, 7, 7, 7, 7, 13, 13, 13, 13, 13, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 28, 28, 28, 28, 28, 28, 34, 34, 34, 34, 34, 34, 40, 40, 40, 40, 40, 40, 46, 46, 46, 46, 46, 46, 52, 52, 52, 52, 52, 52, 58, 58, 58, 58, 58, 58, 64, 64, 64, 64, 64, 64, 70, 70, 70, 70, 70, 70, 76, 76, 76, 76, 76, 76, 82, 82, 82, 82, 82, 82, 88, 88, 88, 88, 88, 88],
      [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
    ],
  },
  {
    name: "drawing-cadence-line-creation-pause-v2.pine",
    sourceSha256: "f28923082a504e228780f146c2b96612d94344706e2a96b77be8b0e7771d9d34",
    csvSha256: "78e79b12a0a35397c6a182c5997f370f8e85b4c7b9a3633a311d08718b0fbd41",
    source: `//@version=6
indicator("Cadence line creation-pause discriminator v2", max_lines_count=3)
var int afterEight = na
var int afterNine = na
int creations = bar_index == 20 ? 9 : bar_index >= 24 and bar_index < 28 ? 0 : bar_index < 4 or bar_index >= 8 ? 1 : 0
if creations > 0
    for i = 0 to creations - 1
        line.new(bar_index, 1, bar_index + 1, 2)
        if i == 7
            afterEight := array.size(line.all)
        if i == 8
            afterNine := array.size(line.all)
if bar_index == 22
    if array.size(line.all) > 0
        line.delete(array.get(line.all, 0))
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(array.size(line.all), "VISIBLE_COUNT", display=display.data_window)
plot(array.size(line.all) > 0 ? line.get_x1(array.get(line.all, 0)) : na, "OLDEST_INDEX", display=display.data_window)
plot(afterEight, "AFTER_EIGHT", display=display.data_window)
plot(afterNine, "AFTER_NINE", display=display.data_window)
`,
    expected: [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95],
      [1, 2, 3, 4, 4, 4, 4, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 7, 8, 2, 3, 3, 3, 3, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 16, 16, 20, 20, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 31, 31, 31, 31, 31, 31, 37, 37, 37, 37, 37, 37, 43, 43, 43, 43, 43, 43, 49, 49, 49, 49, 49, 49, 55, 55, 55, 55, 55, 55, 61, 61, 61, 61, 61, 61, 67, 67, 67, 67, 67, 67, 73, 73, 73, 73, 73, 73, 79, 79, 79, 79, 79, 79, 85, 85, 85, 85, 85, 85, 91, 91, 91],
      [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
      [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7]
    ],
  },
  {
    name: "drawing-cadence-line-same-bar-burst-v2.pine",
    sourceSha256: "236bf1b4c498a15a5cd6b6328c829cf396513f75b23a2e513b2f083fc36faa10",
    csvSha256: "d671fc128a7c95ea43c6825189413460e2656dd28444eb91ddf0cc3e0aa572f1",
    source: `//@version=6
indicator("Cadence line same-bar-burst discriminator v2", max_lines_count=3)
var int afterEight = na
var int afterNine = na
int creations = bar_index == 0 ? 9 : bar_index >= 4 and not (bar_index >= 8 and bar_index < 12) ? 1 : 0
if creations > 0
    for i = 0 to creations - 1
        line.new(bar_index, 1, bar_index + 1, 2)
        if i == 7
            afterEight := array.size(line.all)
        if i == 8
            afterNine := array.size(line.all)
if bar_index == 6
    if array.size(line.all) > 0
        line.delete(array.get(line.all, 0))
plot(bar_index, "BAR_INDEX", display=display.data_window)
plot(array.size(line.all), "VISIBLE_COUNT", display=display.data_window)
plot(array.size(line.all) > 0 ? line.get_x1(array.get(line.all, 0)) : na, "OLDEST_INDEX", display=display.data_window)
plot(afterEight, "AFTER_EIGHT", display=display.data_window)
plot(afterNine, "AFTER_NINE", display=display.data_window)
`,
    expected: [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95],
      [3, 3, 3, 3, 4, 5, 5, 6, 6, 6, 6, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6, 7, 8, 3, 4, 5, 6],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 12, 12, 12, 12, 12, 18, 18, 18, 18, 18, 18, 24, 24, 24, 24, 24, 24, 30, 30, 30, 30, 30, 30, 36, 36, 36, 36, 36, 36, 42, 42, 42, 42, 42, 42, 48, 48, 48, 48, 48, 48, 54, 54, 54, 54, 54, 54, 60, 60, 60, 60, 60, 60, 66, 66, 66, 66, 66, 66, 72, 72, 72, 72, 72, 72, 78, 78, 78, 78, 78, 78, 84, 84, 84, 84, 84, 84, 90, 90, 90, 90],
      [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
      [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
    ],
  }
];

describe('TOP20 job6 native v18 quota3 cadence', () => {
  for (const capture of captures) {
    it(capture.name, () => {
      expect(createHash('sha256').update(capture.source).digest('hex')).toBe(capture.sourceSha256);
      const bars = Array.from({ length: 96 }, (_, index) => ({ time: (index + 1) * 120000, open: 1, high: 2, low: 0, close: 1, volume: 10 }));
      const result = executeScript(parse(capture.source), bars);
      expect(result.errors).toEqual([]);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(result.plots.map(plot => plot.values)).toEqual(capture.expected);
    });
  }
});
