import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { runCompatScript } from './fixtures';

const captures = [
  {
    "name": "silent-s7-merge-reversed-v20-v1.pine",
    "sha": "775194789cde5d51f6ea093394a3f0f5b9f05440803c72b69d681d062fec234d",
    "source": "//@version=6\nindicator(\"silent-s7-merge-reversed-v20-v1\", precision=16)\nvar table id = table.new(position.top_right, 2, 2)\nvar int completed = 0\nif barstate.islastconfirmedhistory\n    table.cell(id, 0, 0, \"A TOP-LEFT\", bgcolor=color.green)\n    table.cell(id, 1, 0, \"B\", bgcolor=color.blue)\n    table.cell(id, 0, 1, \"C\", bgcolor=color.yellow)\n    table.cell(id, 1, 1, \"D BOTTOM-RIGHT\", bgcolor=color.red)\n    table.merge_cells(id, 1, 1, 0, 0)\n    completed := 1\nplot(bar_index, title=\"CHART_INDEX\", display=display.data_window)\nplot(time, title=\"CHART_TIME_MS\", display=display.data_window)\nplot(completed, title=\"MERGE_COMPLETED\", display=display.data_window)\n"
  },
  {
    "name": "silent-s7-merge-ordered-control-v20-v1.pine",
    "sha": "cde6a5711eebd345a9323e65cad096d0304adf3684c6c193ea85d6f1c1a63ce2",
    "source": "//@version=6\nindicator(\"silent-s7-merge-ordered-control-v20-v1\", precision=16)\nvar table id = table.new(position.top_right, 2, 2)\nvar int completed = 0\nif barstate.islastconfirmedhistory\n    table.cell(id, 0, 0, \"A TOP-LEFT\", bgcolor=color.green)\n    table.cell(id, 1, 0, \"B\", bgcolor=color.blue)\n    table.cell(id, 0, 1, \"C\", bgcolor=color.yellow)\n    table.cell(id, 1, 1, \"D BOTTOM-RIGHT\", bgcolor=color.red)\n    table.merge_cells(id, 0, 0, 1, 1)\n    completed := 1\nplot(bar_index, title=\"CHART_INDEX\", display=display.data_window)\nplot(time, title=\"CHART_TIME_MS\", display=display.data_window)\nplot(completed, title=\"MERGE_COMPLETED\", display=display.data_window)\n"
  }
];

describe("Native v20 S7 table contract", () => {
  for (const capture of captures) {
    it(capture.name, () => {
      expect(createHash("sha256").update(capture.source).digest("hex")).toBe(capture.sha);
      const result = runCompatScript(capture.source);
      const table = result.drawings?.find(drawing => drawing.type === "table");
      if (table?.type !== "table") throw new Error("Expected captured table");
      if (capture.name.includes('reversed')) {
        expect(result.errors).toEqual([expect.objectContaining({
          code: 'RE10127', barIndex: 11,
          message: 'Error on bar 11: Start cell in [1, 1] cannot be below or to the right of the end cell [0, 0].',
        })]);
      } else {
        expect(result.errors).toEqual([]);
        expect(table.cells[0]).toMatchObject({ text: 'A TOP-LEFT', bgcolor: '#4CAF50' });
      }
    });
  }
});
