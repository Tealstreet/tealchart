import type { DrawingOutput } from '@tealstreet/tealscript';

import { describe, expect, it } from 'vitest';

import { partitionTealScriptDrawings } from './TealScriptDrawingPartition';

describe('partitionTealScriptDrawings', () => {
  it('partitions drawing outputs in one pass while preserving per-type order', () => {
    const line1 = {
      type: 'line',
      id: 'line-1',
      scriptId: 'script-1',
      barIndex: 0,
      x1: 0,
      y1: 1,
      x2: 1,
      y2: 2,
      xloc: 'bar_index',
      extend: 'none',
      color: '#2962FF',
      width: 1,
      style: 'solid',
    } satisfies DrawingOutput;
    const box = {
      type: 'box',
      id: 'box-1',
      scriptId: 'script-1',
      barIndex: 0,
      left: 0,
      top: 2,
      right: 1,
      bottom: 1,
      xloc: 'bar_index',
      extend: 'none',
      borderColor: '#2962FF',
      borderWidth: 1,
      borderStyle: 'solid',
      bgcolor: '#00000000',
      text: '',
      textColor: null,
      textSize: 'normal',
    } satisfies DrawingOutput;
    const linefill = {
      type: 'linefill',
      id: 'fill-1',
      scriptId: 'script-1',
      barIndex: 0,
      line1: 'line-1',
      line2: 'line-2',
      color: 'rgba(41, 98, 255, 0.18)',
    } satisfies DrawingOutput;
    const label = {
      type: 'label',
      id: 'label-1',
      scriptId: 'script-1',
      barIndex: 0,
      x: 0,
      y: 1,
      xloc: 'bar_index',
      yloc: 'price',
      text: 'A',
      color: '#1f2937',
      textColor: '#ffffff',
      style: 'label_left',
      size: 'normal',
    } satisfies DrawingOutput;
    const polyline = {
      type: 'polyline',
      id: 'polyline-1',
      scriptId: 'script-1',
      barIndex: 0,
      points: [
        { type: 'chart.point', time: null, index: 0, price: 1 },
        { type: 'chart.point', time: null, index: 1, price: 2 },
      ],
      curved: false,
      closed: false,
      xloc: 'bar_index',
      lineColor: '#2962FF',
      fillColor: null,
      lineStyle: 'solid',
      lineWidth: 1,
    } satisfies DrawingOutput;
    const table = {
      type: 'table',
      id: 'table-1',
      scriptId: 'script-1',
      barIndex: 0,
      position: 'top_right',
      columns: 1,
      rows: 1,
      bgcolor: null,
      frameColor: null,
      frameWidth: 1,
      borderColor: null,
      borderWidth: 1,
      cells: [],
      forceOverlay: true,
    } satisfies DrawingOutput;
    const line2 = { ...line1, id: 'line-2', x1: 2, x2: 3 } satisfies DrawingOutput;

    const partition = partitionTealScriptDrawings([line1, box, linefill, label, polyline, table, line2]);

    expect(partition.lines).toEqual([line1, line2]);
    expect(partition.boxes).toEqual([box]);
    expect(partition.linefills).toEqual([linefill]);
    expect(partition.labels).toEqual([label]);
    expect(partition.polylines).toEqual([polyline]);
    expect(partition.tables).toEqual([table]);
    expect(partition.linesById.get('line-1')).toBe(line1);
    expect(partition.linesById.get('line-2')).toBe(line2);
  });

  it('returns empty collections for no drawings', () => {
    const partition = partitionTealScriptDrawings([]);

    expect(partition.boxes).toEqual([]);
    expect(partition.labels).toEqual([]);
    expect(partition.lines).toEqual([]);
    expect(partition.linefills).toEqual([]);
    expect(partition.polylines).toEqual([]);
    expect(partition.tables).toEqual([]);
    expect(partition.linesById.size).toBe(0);
  });
});
