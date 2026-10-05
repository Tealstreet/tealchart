import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { runCompatScript } from './fixtures';

const captures = [
  {
    "name": "silent-s2-table-border-width-151-v20-v2.pine",
    "sha": "a6d51d5288bbf7eb76e46f1aeae98aff14ca1e0a3acc20c2c6d9f8931b0a01b2",
    "source": "//@version=6\nindicator(\"silent-s2-table-border-width-151-v20-v2\", precision=16)\nvar table id = table.new(position.top_right, 2, 2, border_width=151, border_color=color.red, frame_color=color.blue)\nvar table reference1 = table.new(position.top_left, 2, 2, border_width=1, border_color=color.red, frame_color=color.blue)\nvar table reference100 = table.new(position.bottom_left, 2, 2, border_width=100, border_color=color.red, frame_color=color.blue)\nvar int completed = 0\nif barstate.islastconfirmedhistory\n    table.cell(id, 0, 0, \"A: border_width 151\", bgcolor=color.yellow)\n    table.cell(id, 1, 0, \"B\")\n    table.cell(id, 0, 1, \"C\")\n    table.cell(id, 1, 1, \"D\")\n    table.cell(reference1, 0, 0, \"REFERENCE WIDTH 1\")\n    table.cell(reference1, 1, 0, \"B\")\n    table.cell(reference1, 0, 1, \"C\")\n    table.cell(reference1, 1, 1, \"D\")\n    table.cell(reference100, 0, 0, \"REFERENCE WIDTH 100\")\n    table.cell(reference100, 1, 0, \"B\")\n    table.cell(reference100, 0, 1, \"C\")\n    table.cell(reference100, 1, 1, \"D\")\n    completed := 1\nplot(bar_index, title=\"CHART_INDEX\", display=display.data_window)\nplot(time, title=\"CHART_TIME_MS\", display=display.data_window)\nplot(151, title=\"REQUESTED_WIDTH\", display=display.data_window)\nplot(completed, title=\"CALL_COMPLETED\", display=display.data_window)\n"
  },
  {
    "name": "silent-s2-table-border-width--1-v20-v2.pine",
    "sha": "e3c19531b76f9c0a61a753ed3e316b24d46ee392f3351454df529578b094c2e7",
    "source": "//@version=6\nindicator(\"silent-s2-table-border-width--1-v20-v2\", precision=16)\nvar table id = table.new(position.top_right, 2, 2, border_width=-1, border_color=color.red, frame_color=color.blue)\nvar table reference1 = table.new(position.top_left, 2, 2, border_width=1, border_color=color.red, frame_color=color.blue)\nvar table reference100 = table.new(position.bottom_left, 2, 2, border_width=100, border_color=color.red, frame_color=color.blue)\nvar int completed = 0\nif barstate.islastconfirmedhistory\n    table.cell(id, 0, 0, \"A: border_width -1\", bgcolor=color.yellow)\n    table.cell(id, 1, 0, \"B\")\n    table.cell(id, 0, 1, \"C\")\n    table.cell(id, 1, 1, \"D\")\n    table.cell(reference1, 0, 0, \"REFERENCE WIDTH 1\")\n    table.cell(reference1, 1, 0, \"B\")\n    table.cell(reference1, 0, 1, \"C\")\n    table.cell(reference1, 1, 1, \"D\")\n    table.cell(reference100, 0, 0, \"REFERENCE WIDTH 100\")\n    table.cell(reference100, 1, 0, \"B\")\n    table.cell(reference100, 0, 1, \"C\")\n    table.cell(reference100, 1, 1, \"D\")\n    completed := 1\nplot(bar_index, title=\"CHART_INDEX\", display=display.data_window)\nplot(time, title=\"CHART_TIME_MS\", display=display.data_window)\nplot(-1, title=\"REQUESTED_WIDTH\", display=display.data_window)\nplot(completed, title=\"CALL_COMPLETED\", display=display.data_window)\n"
  },
  {
    "name": "silent-s2-table-frame-width-151-v20-v2.pine",
    "sha": "dd2f17766f69ba315d3fe891c13f7ebe2dd80375494393f9a8aa176e74134514",
    "source": "//@version=6\nindicator(\"silent-s2-table-frame-width-151-v20-v2\", precision=16)\nvar table id = table.new(position.top_right, 2, 2, frame_width=151, border_color=color.red, frame_color=color.blue)\nvar table reference1 = table.new(position.top_left, 2, 2, frame_width=1, border_color=color.red, frame_color=color.blue)\nvar table reference100 = table.new(position.bottom_left, 2, 2, frame_width=100, border_color=color.red, frame_color=color.blue)\nvar int completed = 0\nif barstate.islastconfirmedhistory\n    table.cell(id, 0, 0, \"A: frame_width 151\", bgcolor=color.yellow)\n    table.cell(id, 1, 0, \"B\")\n    table.cell(id, 0, 1, \"C\")\n    table.cell(id, 1, 1, \"D\")\n    table.cell(reference1, 0, 0, \"REFERENCE WIDTH 1\")\n    table.cell(reference1, 1, 0, \"B\")\n    table.cell(reference1, 0, 1, \"C\")\n    table.cell(reference1, 1, 1, \"D\")\n    table.cell(reference100, 0, 0, \"REFERENCE WIDTH 100\")\n    table.cell(reference100, 1, 0, \"B\")\n    table.cell(reference100, 0, 1, \"C\")\n    table.cell(reference100, 1, 1, \"D\")\n    completed := 1\nplot(bar_index, title=\"CHART_INDEX\", display=display.data_window)\nplot(time, title=\"CHART_TIME_MS\", display=display.data_window)\nplot(151, title=\"REQUESTED_WIDTH\", display=display.data_window)\nplot(completed, title=\"CALL_COMPLETED\", display=display.data_window)\n"
  },
  {
    "name": "silent-s2-table-frame-width--1-v20-v2.pine",
    "sha": "a45438b9cbef8902480648cad8a9202a612f0400df6b0f6be589bb8732ae242e",
    "source": "//@version=6\nindicator(\"silent-s2-table-frame-width--1-v20-v2\", precision=16)\nvar table id = table.new(position.top_right, 2, 2, frame_width=-1, border_color=color.red, frame_color=color.blue)\nvar table reference1 = table.new(position.top_left, 2, 2, frame_width=1, border_color=color.red, frame_color=color.blue)\nvar table reference100 = table.new(position.bottom_left, 2, 2, frame_width=100, border_color=color.red, frame_color=color.blue)\nvar int completed = 0\nif barstate.islastconfirmedhistory\n    table.cell(id, 0, 0, \"A: frame_width -1\", bgcolor=color.yellow)\n    table.cell(id, 1, 0, \"B\")\n    table.cell(id, 0, 1, \"C\")\n    table.cell(id, 1, 1, \"D\")\n    table.cell(reference1, 0, 0, \"REFERENCE WIDTH 1\")\n    table.cell(reference1, 1, 0, \"B\")\n    table.cell(reference1, 0, 1, \"C\")\n    table.cell(reference1, 1, 1, \"D\")\n    table.cell(reference100, 0, 0, \"REFERENCE WIDTH 100\")\n    table.cell(reference100, 1, 0, \"B\")\n    table.cell(reference100, 0, 1, \"C\")\n    table.cell(reference100, 1, 1, \"D\")\n    completed := 1\nplot(bar_index, title=\"CHART_INDEX\", display=display.data_window)\nplot(time, title=\"CHART_TIME_MS\", display=display.data_window)\nplot(-1, title=\"REQUESTED_WIDTH\", display=display.data_window)\nplot(completed, title=\"CALL_COMPLETED\", display=display.data_window)\n"
  }
];

describe("Native v20 S2 table contract", () => {
  for (const capture of captures) {
    it(capture.name, () => {
      expect(createHash("sha256").update(capture.source).digest("hex")).toBe(capture.sha);
      const result = runCompatScript(capture.source);
      const table = result.drawings?.find(drawing => drawing.type === "table");
      if (table?.type !== "table") throw new Error("Expected captured table");
      expect(result.errors).toEqual([]);
      const field = capture.name.includes('border') ? 'borderWidth' : 'frameWidth';
      expect(table[field]).toBe(capture.name.includes('--1') ? 0 : 151);
    });
  }
});
