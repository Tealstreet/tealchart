import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { runCompatScript } from './fixtures';

const captures = [
  {
    "name": "silent-p3-table-creation-only-v20-v1.pine",
    "sha": "93476768dc17671431a8be2233848de1e020867b4e6d5d6649ea107dc30411f0",
    "source": "//@version=6\nindicator(\"silent-p3-table-creation-only-v20-v1\", precision=16)\nvar table id = table.new(position.top_right, 0, 1)\nvar int completed = 0\nif barstate.islastconfirmedhistory\n    completed := 1\nplot(bar_index, title=\"CHART_INDEX\", display=display.data_window)\nplot(time, title=\"CHART_TIME_MS\", display=display.data_window)\nplot(0, title=\"REQUESTED_COLUMNS\", display=display.data_window)\nplot(completed, title=\"CALL_COMPLETED\", display=display.data_window)\n"
  },
  {
    "name": "silent-p3-table-cell-zero-v20-v1.pine",
    "sha": "a437bb71f4d16bb2046e39f4f09e77c646c0e8beefe043452ae0388380b62cce",
    "source": "//@version=6\nindicator(\"silent-p3-table-cell-zero-v20-v1\", precision=16)\nvar table id = table.new(position.top_right, 0, 1)\nvar int completed = 0\nif barstate.islastconfirmedhistory\n    table.cell(id, 0, 0, \"CELL ZERO SURVIVED\")\n    completed := 1\nplot(bar_index, title=\"CHART_INDEX\", display=display.data_window)\nplot(time, title=\"CHART_TIME_MS\", display=display.data_window)\nplot(0, title=\"REQUESTED_COLUMNS\", display=display.data_window)\nplot(completed, title=\"CALL_COMPLETED\", display=display.data_window)\n"
  },
  {
    "name": "silent-p3-table-one-column-control-v20-v1.pine",
    "sha": "0634ac18ee0e973284f0df28a0d60d72d64a244e931a69c97f08a47433a599f1",
    "source": "//@version=6\nindicator(\"silent-p3-table-one-column-control-v20-v1\", precision=16)\nvar table id = table.new(position.top_right, 1, 1)\nvar int completed = 0\nif barstate.islastconfirmedhistory\n    table.cell(id, 0, 0, \"CELL ZERO SURVIVED\")\n    completed := 1\nplot(bar_index, title=\"CHART_INDEX\", display=display.data_window)\nplot(time, title=\"CHART_TIME_MS\", display=display.data_window)\nplot(1, title=\"REQUESTED_COLUMNS\", display=display.data_window)\nplot(completed, title=\"CALL_COMPLETED\", display=display.data_window)\n"
  }
];

describe("Native v20 P3 table contract", () => {
  for (const capture of captures) {
    it(capture.name, () => {
      expect(createHash("sha256").update(capture.source).digest("hex")).toBe(capture.sha);
      const result = runCompatScript(capture.source);
      const table = result.drawings?.find(drawing => drawing.type === "table");
      if (table?.type !== "table") throw new Error("Expected captured table");
      expect(table.columns).toBe(capture.name.includes('one-column') ? 1 : 0);
      if (capture.name.includes('cell-zero')) {
        expect(result.errors).toEqual([expect.objectContaining({
          code: 'RE10039', barIndex: 11,
          message: 'Error on bar 11: Column 0 is out of table bounds, number of columns is 0.',
        })]);
        expect(table.cells).toEqual([]);
      } else {
        expect(result.errors).toEqual([]);
        expect(table.cells).toHaveLength(capture.name.includes('one-column') ? 1 : 0);
      }
    });
  }
});
