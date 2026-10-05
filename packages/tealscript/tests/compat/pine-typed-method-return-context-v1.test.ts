import { describe, expect, it } from 'vitest';

import { runCompatScript } from './fixtures';

// User-defined-functions: each written call inherits its own argument types.
// Methods/#method-overloading: overload selection follows argument types.
const cases = [
  {
    name: 'wrapper-declaration-0-calls-0',
    source:
      '//@version=6\nindicator("wrapper order control")\nmethod tag(array<int> self) => 11\nmethod tag(array<float> self) => 22\nforward(self) => self.tag()\nplot(forward(array.from(1)), "int")\nplot(forward(array.from(1.0)), "float")\n',
    bars: [
      {
        time: 60000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
    ],
    expected: [11, 22],
  },
  {
    name: 'wrapper-declaration-0-calls-1',
    source:
      '//@version=6\nindicator("wrapper order control")\nmethod tag(array<int> self) => 11\nmethod tag(array<float> self) => 22\nforward(self) => self.tag()\nplot(forward(array.from(1.0)), "float")\nplot(forward(array.from(1)), "int")\n',
    bars: [
      {
        time: 60000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
    ],
    expected: [22, 11],
  },
  {
    name: 'wrapper-declaration-1-calls-0',
    source:
      '//@version=6\nindicator("wrapper order control")\nmethod tag(array<float> self) => 22\nmethod tag(array<int> self) => 11\nforward(self) => self.tag()\nplot(forward(array.from(1)), "int")\nplot(forward(array.from(1.0)), "float")\n',
    bars: [
      {
        time: 60000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
    ],
    expected: [11, 22],
  },
  {
    name: 'wrapper-declaration-1-calls-1',
    source:
      '//@version=6\nindicator("wrapper order control")\nmethod tag(array<float> self) => 22\nmethod tag(array<int> self) => 11\nforward(self) => self.tag()\nplot(forward(array.from(1.0)), "float")\nplot(forward(array.from(1)), "int")\n',
    bars: [
      {
        time: 60000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
    ],
    expected: [22, 11],
  },
  {
    name: 'wrapper-declaration-0-calls-0-v5',
    source:
      '//@version=5\nindicator("wrapper order control")\nmethod tag(array<int> self) => 11\nmethod tag(array<float> self) => 22\nforward(self) => self.tag()\nplot(forward(array.from(1)), "int")\nplot(forward(array.from(1.0)), "float")\n',
    bars: [
      {
        time: 60000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
    ],
    expected: [11, 22],
  },
  {
    name: 'wrapper-declaration-0-calls-1-v5',
    source:
      '//@version=5\nindicator("wrapper order control")\nmethod tag(array<int> self) => 11\nmethod tag(array<float> self) => 22\nforward(self) => self.tag()\nplot(forward(array.from(1.0)), "float")\nplot(forward(array.from(1)), "int")\n',
    bars: [
      {
        time: 60000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
    ],
    expected: [22, 11],
  },
  {
    name: 'wrapper-declaration-1-calls-0-v5',
    source:
      '//@version=5\nindicator("wrapper order control")\nmethod tag(array<float> self) => 22\nmethod tag(array<int> self) => 11\nforward(self) => self.tag()\nplot(forward(array.from(1)), "int")\nplot(forward(array.from(1.0)), "float")\n',
    bars: [
      {
        time: 60000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
    ],
    expected: [11, 22],
  },
  {
    name: 'wrapper-declaration-1-calls-1-v5',
    source:
      '//@version=5\nindicator("wrapper order control")\nmethod tag(array<float> self) => 22\nmethod tag(array<int> self) => 11\nforward(self) => self.tag()\nplot(forward(array.from(1.0)), "float")\nplot(forward(array.from(1)), "int")\n',
    bars: [
      {
        time: 60000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
    ],
    expected: [22, 11],
  },
  {
    name: 'receiver-evaluated-once-control',
    source:
      '//@version=6\nindicator("receiver control")\nvar calls=array.new_int(1,0)\nmethod tag(array<int> self) => 11\ngetReceiver() =>\n    array.set(calls,0,array.get(calls,0)+1)\n    array.from(1)\nplot(getReceiver().tag(),"tag")\nplot(array.get(calls,0),"count")\n',
    bars: [
      {
        time: 60000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
    ],
    expected: [11, 1],
  },
  {
    name: 'method-division-context-v5',
    source:
      '//@version=5\nindicator("method and division contexts")\nmethod tag(array<int> self) => 11\nmethod tag(array<float> self) => 22\nhalf(x) => x / 2\nforward(self, x) => self.tag() + half(x)\nrelay(self, x) => forward(self, x)\nplot(relay(array.from(1), 5), "int")\nplot(relay(array.from(1.0), 5.0), "float")\n',
    bars: [
      {
        time: 60000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
    ],
    expected: [13, 24.5],
  },
  {
    name: 'method-division-context-v6',
    source:
      '//@version=6\nindicator("method and division contexts")\nmethod tag(array<int> self) => 11\nmethod tag(array<float> self) => 22\nhalf(x) => x / 2\nforward(self, x) => self.tag() + half(x)\nrelay(self, x) => forward(self, x)\nplot(relay(array.from(1), 5), "int")\nplot(relay(array.from(1.0), 5.0), "float")\n',
    bars: [
      {
        time: 60000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
    ],
    expected: [13.5, 24.5],
  },
  {
    name: 'void-wrapper-type-context',
    source:
      '//@version=6\nindicator("void wrappers")\nvar log = array.new_int()\nmethod mark(array<int> self) => array.push(log, 11)\nmethod mark(array<float> self) => array.push(log, 22)\nforward(self) => self.mark()\nforward(array.new_int())\nforward(array.new_float())\nplot(array.get(log, 0), "int")\nplot(array.get(log, 1), "float")\n',
    bars: [
      {
        time: 60000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
    ],
    expected: [11, 22],
  },
  {
    name: 'tuple-wrapper-type-context',
    source:
      '//@version=6\nindicator("tuple wrappers")\nmethod tag(array<int> self) => [11, 12]\nmethod tag(array<float> self) => [22, 23]\nforward(self) => self.tag()\n[a, b] = forward(array.from(1))\n[c, d] = forward(array.from(1.0))\nplot(a)\nplot(b)\nplot(c)\nplot(d)\n',
    bars: [
      {
        time: 60000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
    ],
    expected: [11, 12, 22, 23],
  },
  {
    name: 'persistent-method-state-through-wrapper',
    source:
      '//@version=6\nindicator("stateful wrappers")\nmethod tag(array<int> self) =>\n    var int count = 10\n    count += 1\n    count - bar_index\nmethod tag(array<float> self) =>\n    var int count = 20\n    count += 1\n    count - bar_index\nforward(self) => self.tag()\nplot(forward(array.new_int()), "int")\nplot(forward(array.new_float()), "float")\n',
    bars: [
      {
        time: 60000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
      {
        time: 120000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
      {
        time: 180000,
        open: 7,
        high: 8,
        low: 6,
        close: 7,
        volume: 10,
      },
    ],
    expected: [11, 21],
  },
] as const;

describe('typed method context across UDF return forms', () => {
  for (const probe of cases) {
    it(probe.name, () => {
      const result = runCompatScript(probe.source, { bars: probe.bars.map((bar) => ({ ...bar })) });
      expect(result.errors).toEqual([]);
      expect(result.plots.map((plot) => plot.values)).toEqual(
        probe.expected.map((value) => probe.bars.map(() => value)),
      );
    });
  }
});
