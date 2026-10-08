import { describe, expect, it } from 'vitest';
import { parse } from '../parser/parser';
import { checkProgram } from './checker';

const cases = [
  {
    "id": "array-sort-indices-method",
    "source": "//@version=6\nindicator(\"V52 array-sort-indices-method\", calc_bars_count=32)\ntype Point\n    int key0\n    int key1\nvalues = array.from(Point.new(2, 10), Point.new(1, 20))\nint fieldIndex = bar_index % 2\nindices = values.sort_indices(sort_field=fieldIndex)\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(fieldIndex, \"FIELD\", display=display.data_window)\nplot(array.get(indices, 0), \"FIRST_INDEX\", display=display.data_window)\nplot(array.get(indices, 1), \"SECOND_INDEX\", display=display.data_window)\n",
    "refused": true
  },
  {
    "id": "array-sort-indices-method-const",
    "source": "//@version=6\nindicator(\"V52 array-sort-indices-method\", calc_bars_count=32)\ntype Point\n    int key0\n    int key1\nvalues = array.from(Point.new(2, 10), Point.new(1, 20))\nconst int fieldIndex = 0\nindices = values.sort_indices(sort_field=fieldIndex)\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(fieldIndex, \"FIELD\", display=display.data_window)\nplot(array.get(indices, 0), \"FIRST_INDEX\", display=display.data_window)\nplot(array.get(indices, 1), \"SECOND_INDEX\", display=display.data_window)\n",
    "refused": false
  },
  {
    "id": "array-sort-indices-method-positional",
    "source": "//@version=6\nindicator(\"V52 array-sort-indices-method\", calc_bars_count=32)\ntype Point\n    int key0\n    int key1\nvalues = array.from(Point.new(2, 10), Point.new(1, 20))\nconst int fieldIndex = 0\nindices = values.sort_indices(order.ascending, 0)\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(fieldIndex, \"FIELD\", display=display.data_window)\nplot(array.get(indices, 0), \"FIRST_INDEX\", display=display.data_window)\nplot(array.get(indices, 1), \"SECOND_INDEX\", display=display.data_window)\n",
    "refused": false
  },
  {
    "id": "array-sort-indices-method-existing-sort-series",
    "source": "//@version=6\nindicator(\"V52 array-sort-indices-method\", calc_bars_count=32)\ntype Point\n    int key0\n    int key1\nvalues = array.from(Point.new(2, 10), Point.new(1, 20))\nint fieldIndex = bar_index % 2\nvalues.sort(sort_field=fieldIndex)\nplot(bar_index)\n",
    "refused": true
  },
  {
    "id": "array-sort-indices-method-existing-sort-const",
    "source": "//@version=6\nindicator(\"V52 array-sort-indices-method\", calc_bars_count=32)\ntype Point\n    int key0\n    int key1\nvalues = array.from(Point.new(2, 10), Point.new(1, 20))\nconst int fieldIndex = 0\nvalues.sort(sort_field=fieldIndex)\nplot(bar_index)\n",
    "refused": false
  },
  {
    "id": "array-sort-indices-namespace",
    "source": "//@version=6\nindicator(\"V52 array-sort-indices-namespace\", calc_bars_count=32)\ntype Point\n    int key0\n    int key1\nvalues = array.from(Point.new(2, 10), Point.new(1, 20))\nint fieldIndex = bar_index % 2\nindices = array.sort_indices(values, sort_field=fieldIndex)\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(fieldIndex, \"FIELD\", display=display.data_window)\nplot(array.get(indices, 0), \"FIRST_INDEX\", display=display.data_window)\nplot(array.get(indices, 1), \"SECOND_INDEX\", display=display.data_window)\n",
    "refused": true
  },
  {
    "id": "array-sort-indices-namespace-const",
    "source": "//@version=6\nindicator(\"V52 array-sort-indices-namespace\", calc_bars_count=32)\ntype Point\n    int key0\n    int key1\nvalues = array.from(Point.new(2, 10), Point.new(1, 20))\nconst int fieldIndex = 0\nindices = array.sort_indices(values, sort_field=fieldIndex)\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(fieldIndex, \"FIELD\", display=display.data_window)\nplot(array.get(indices, 0), \"FIRST_INDEX\", display=display.data_window)\nplot(array.get(indices, 1), \"SECOND_INDEX\", display=display.data_window)\n",
    "refused": false
  },
  {
    "id": "array-sort-indices-namespace-positional",
    "source": "//@version=6\nindicator(\"V52 array-sort-indices-namespace\", calc_bars_count=32)\ntype Point\n    int key0\n    int key1\nvalues = array.from(Point.new(2, 10), Point.new(1, 20))\nconst int fieldIndex = 0\nindices = array.sort_indices(values, order.ascending, 0)\nplot(bar_index, \"INDEX\", display=display.data_window)\nplot(fieldIndex, \"FIELD\", display=display.data_window)\nplot(array.get(indices, 0), \"FIRST_INDEX\", display=display.data_window)\nplot(array.get(indices, 1), \"SECOND_INDEX\", display=display.data_window)\n",
    "refused": false
  },
  {
    "id": "array-sort-indices-namespace-existing-sort-series",
    "source": "//@version=6\nindicator(\"V52 array-sort-indices-namespace\", calc_bars_count=32)\ntype Point\n    int key0\n    int key1\nvalues = array.from(Point.new(2, 10), Point.new(1, 20))\nint fieldIndex = bar_index % 2\narray.sort(values, sort_field=fieldIndex)\nplot(bar_index)\n",
    "refused": true
  },
  {
    "id": "array-sort-indices-namespace-existing-sort-const",
    "source": "//@version=6\nindicator(\"V52 array-sort-indices-namespace\", calc_bars_count=32)\ntype Point\n    int key0\n    int key1\nvalues = array.from(Point.new(2, 10), Point.new(1, 20))\nconst int fieldIndex = 0\narray.sort(values, sort_field=fieldIndex)\nplot(bar_index)\n",
    "refused": false
  },
  {
    "id": "custom-sort-indices-series-field",
    "source": "//@version=6\nindicator(\"Custom sort_indices\")\ntype Point\n    int key\nmethod sort_indices(array<Point> self, int sort_field) =>\n    array.from(sort_field)\nvalues = array.from(Point.new(1), Point.new(2))\nindices = values.sort_indices(sort_field=bar_index % 2)\nplot(array.get(indices, 0))\n",
    "refused": false
  }
];

describe('v52 UDT sort_indices field boundary', () => {
  for (const example of cases) {
    it(example.id, () => {
      const errors = checkProgram(parse(example.source)).diagnostics.filter(d => d.severity === 'error');
      expect(errors.length > 0, JSON.stringify(errors)).toBe(example.refused);
    });
  }
});
