import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Independent expectations from pine-v6-reference-v1.json (2026-10-03),
// kw_type, kw_enum and kw_method. Object alias/copy rules additionally cite the
// official Objects manual linked by kw_type. No engine-derived expectations.

// Red proof: zeroed defaults (3), reversed/ignored constructor arguments (3),
// assignment copying (1), copy aliasing (2), erased/reversed method arguments (2).
// All 11 targeted cases failed, then passed after restoring production sources.

// Inverse proof: a discarded source copy lowering direct enum str.tostring calls
// to their documented titles passed all 14 ordinary assertions, including the
// three expected reds with it.fails disabled.

// Variable proof: original engine failed all three strengthened enum cases.
// Isolated variable-title lowering passed all 14; disabling that lowering failed
// the three cases again, then restoration passed. Source copy discarded.
const reference = 'https://www.tradingview.com/pine-script-reference/v6/';

interface DeclarationCase {
  name: string;
  entry: 'type' | 'enum' | 'method';
  rule: string;
  rejects: string;
  body: string;
  expected: number;
}

const cases: DeclarationCase[] = [
  {
    name: 'UDT construction applies each explicit field default',
    entry: 'type',
    rule: 'detailedDesc: new instances initialize fields with definition defaults',
    rejects: 'zero initialization, skipped string default, swapped numeric fields',
    body: `type Sample
    int x = 4
    int y = -3
    string tag = "pine"
value = Sample.new()
plot(value.x * 100 + value.y * 10 + str.length(value.tag), "Result")`,
    expected: 374,
  },
  {
    name: 'UDT numeric fields without defaults initialize as na',
    entry: 'type',
    rule: 'detailedDesc: fields without specified defaults initialize as na',
    rejects: 'zero, type-name strings, constructor argument count substituted for fields',
    body: `type Sample
    int x
    float y
value = Sample.new()
plot((na(value.x) ? 1 : 0) + (na(value.y) ? 2 : 0), "Result")`,
    expected: 3,
  },
  {
    name: 'UDT positional constructor arguments override field defaults in order',
    entry: 'type',
    rule: 'detailedDesc: initial arguments to new override defaults',
    rejects: 'ignored overrides, reversed binding, one value broadcast to all fields',
    body: `type Sample
    int x = 4
    int y = -3
    int z = 8
value = Sample.new(2, -7, 9)
plot(value.x * 100 + value.y * 10 + value.z, "Result")`,
    expected: 139,
  },
  {
    name: 'UDT named constructor arguments bind by field name',
    entry: 'type',
    rule: 'detailedDesc: foo.new(x = true) sets the named field',
    rejects: 'argument-order binding, ignored names, alphabetical field order',
    body: `type Sample
    int x = 4
    int y = -3
    int z = 8
value = Sample.new(z = 9, x = 2, y = -7)
plot(value.x * 100 + value.y * 10 + value.z, "Result")`,
    expected: 139,
  },
  {
    name: 'UDT zero override preserves other fields defaults',
    entry: 'type',
    rule: 'detailedDesc: named initial values override only their fields defaults',
    rejects: 'zero treated as missing, all defaults cleared, omitted fields bound to zero',
    body: `type Sample
    int x = 4
    int y = -3
    int z = 8
value = Sample.new(x = 0)
plot(value.x * 100 + value.y * 10 + value.z, "Result")`,
    expected: -22,
  },
  {
    name: 'UDT assignment shares the object reference',
    entry: 'type',
    rule: 'https://www.tradingview.com/pine-script-docs/language/objects/#copying-objects: assignment stores the reference',
    rejects: 'implicit copy, ignored field reassignment, independent alias fields',
    body: `type Sample
    int x = 4
original = Sample.new()
alias = original
alias.x := -7
plot(original.x, "Result")`,
    expected: -7,
  },
  {
    name: 'UDT copy isolates primitive fields',
    entry: 'type',
    rule: 'https://www.tradingview.com/pine-script-docs/language/objects/#copying-objects: copy creates an independent object',
    rejects: 'copy returning original, mutation ignored, copied primitive field cleared',
    body: `type Sample
    int x = 4
original = Sample.new()
copied = original.copy()
copied.x := -7
plot(original.x * 10 + copied.x, "Result")`,
    expected: 33,
  },
  {
    name: 'UDT copy shares reference fields while isolating primitive fields',
    entry: 'type',
    rule: 'https://www.tradingview.com/pine-script-docs/language/objects/#copying-objects: copy is shallow for special-type fields',
    rejects: 'deep copy, alias of the whole object, detached array field, ignored mutation',
    body: `type Sample
    array<int> data
    int x = 4
original = Sample.new(array.from(4, -7, 2))
copied = original.copy()
array.set(copied.data, 1, 9)
copied.x := -3
plot(original.x * 100 + array.get(original.data, 1) * 10 + copied.x, "Result")`,
    expected: 487,
  },
  {
    name: 'UDT fields can reference the same user-defined type recursively',
    entry: 'type',
    rule: 'description: fields may use the defined UDT itself',
    rejects: 'recursive field erased, self reference substituted, swapped constructor values',
    body: `type Node
    int value = 4
    Node next
tail = Node.new(-7)
head = Node.new(2, tail)
plot(head.value * 10 + head.next.value, "Result")`,
    expected: 13,
  },
  {
    name: 'enum tostring returns the explicit title',
    entry: 'enum',
    rule: 'https://www.tradingview.com/pine-script-docs/language/enums/#utilizing-field-titles: str.tostring retrieves the selected member title through variables',
    rejects: 'qualified member name, variable/alias title loss, stale title after reassignment, equal titles merging distinct members, ordinary string conversion changed',
    body: `enum Direction
    north = "Up"
    west = "Down"
    other = "Up"
value = Direction.north
value := bar_index == 0 ? Direction.north : Direction.west
alias = value
plain = "Direction.north"
expectedTitle = bar_index == 0 ? "Up" : "Down"
plot((str.tostring(Direction.north) == "Up" ? 1 : 0) + (str.tostring(alias) == expectedTitle ? 2 : 0) + (str.tostring(value=value) == expectedTitle ? 4 : 0) + (str.tostring(plain) == "Direction.north" ? 8 : 0) + (Direction.north != Direction.other ? 16 : 0), "Result")`,
    expected: 31,
  },
  {
    name: 'enum tostring defaults the title to the unqualified field name',
    entry: 'enum',
    rule: 'description: unspecified field title is the string representation of its name',
    rejects: 'qualified member name, empty title, enum type name substituted',
    body: `enum Direction
    south
Direction value = input.enum(Direction.south, "Direction")
plain = "Direction.south"
plot((str.tostring(Direction.south) == "south" ? 1 : 0) + (str.tostring(value) == "south" ? 2 : 0) + (str.tostring(value=value) == "south" ? 4 : 0) + (str.tostring(plain) == "Direction.south" ? 8 : 0), "Result")`,
    expected: 15,
  },
  {
    name: 'enum tostring preserves an explicitly empty title',
    entry: 'enum',
    rule: 'description and timezone example: a field title may be an empty string',
    rejects: 'falsy title replaced by field name, missing title, qualified member name',
    body: `enum Direction
    empty = ""
readTitle() =>
    localValue = Direction.empty
    str.tostring(value=localValue)
var Direction value = Direction.empty
plain = "Direction.empty"
plot((str.tostring(Direction.empty) == "" ? 1 : 0) + (str.tostring(value) == "" ? 2 : 0) + (readTitle() == "" ? 4 : 0) + (str.tostring(plain) == "Direction.empty" ? 8 : 0), "Result")`,
    expected: 15,
  },
  {
    name: 'user method dot call supplies the receiver as its first argument',
    entry: 'method',
    rule: 'description: dot notation omits the first parameter and supplies the receiver',
    rejects: 'missing receiver, receiver replaced by zero, reversed argument order',
    body: `method encode(int receiver, int digit) => receiver * 10 + digit
value = 2
plot(value.encode(7), "Result")`,
    expected: 27,
  },
  {
    name: 'user method can be called as a normal function with an explicit receiver',
    entry: 'method',
    rule: 'description: normal function notation supplies the first parameter explicitly',
    rejects: 'first argument dropped, implicit receiver inserted, reversed argument order',
    body: `method encode(int receiver, int digit) => receiver * 10 + digit
plot(encode(2, 7), "Result")`,
    expected: 27,
  },
];

function declarationValues(testCase: DeclarationCase): Array<number | null> {
  const result = runCompatScript(`//@version=6\nindicator("Declarations reference")\n${testCase.body}`);
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  const values = getPlot(result, 'Result').values;
  expect(values).toHaveLength(compatibilityBars.length);
  return values;
}

describe('Pine v6 declaration reference behavior', () => {
  for (const testCase of cases) {
    const title = `${testCase.name} [${reference}#kw_${testCase.entry}; ${testCase.rule}; rejects ${testCase.rejects}]`;
    const expected = compatibilityBars.map(() => testCase.expected);
    it(title, () => {
      expect(declarationValues(testCase)).toEqual(expected);
    });
  }
});
