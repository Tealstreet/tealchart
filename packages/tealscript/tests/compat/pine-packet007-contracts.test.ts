import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { getArrayValue, setArrayValue } from '../../src/runtime/arrays';
import {
  clearMap,
  copyMap,
  createPineMap,
  getMapSize,
  getMapValue,
  putAllMapValues,
  putMapValue,
  removeMapValue,
} from '../../src/runtime/maps';
import {
  concatMatrix,
  createPineMatrix,
  getMatrixValue,
  removeMatrixRow,
  reshapeMatrix,
  reverseMatrix,
  swapMatrixColumns,
  swapMatrixRows,
} from '../../src/runtime/matrices';
import { createPineUdtObject, getUdtField, setUdtField } from '../../src/runtime/objects';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const header = '//@version=6\nindicator("Packet007")\n';
const point = (n: number) => createPineUdtObject('Point', [['n', n]]);
const errors = (s: string) => checkProgram(parse(header + s)).diagnostics.filter((d) => d.severity === 'error');
const udt = 'type Point\n    int n\n';
const referenceMatrix = () => {
  const refs = Array.from({ length: 6 }, (_, i) => point(i + 1));
  const m = createPineMatrix(2, 3, refs[0]);
  m.values = [...refs];
  return { refs, m };
};
describe('packet007 reference runtime', () => {
  it('removed row keeps shared objects and independent slots', () => {
    const { m, refs } = referenceMatrix();
    const row = removeMatrixRow(m, 0);
    expect([0, 1, 2].map((i) => getArrayValue(row, i))).toEqual(refs.slice(0, 3));
    expect(getArrayValue(row, 1)).toBe(refs[1]);
    setUdtField(refs[1], 'n', 19);
    expect(getUdtField(getArrayValue(row, 1) as ReturnType<typeof point>, 'n')).toBe(19);
    setArrayValue(row, 0, refs[5]);
    expect(m.values).toEqual(refs.slice(3));
    expect([m.rows, m.columns]).toEqual([1, 3]);
  });
  it('swap columns moves handles and retains untouched column', () => {
    const { m, refs } = referenceMatrix();
    swapMatrixColumns(m, 0, 2);
    expect(m.values).toEqual([refs[2], refs[1], refs[0], refs[5], refs[4], refs[3]]);
    expect(getMatrixValue(m, 1, 1)).toBe(refs[4]);
    expect([m.rows, m.columns]).toEqual([2, 3]);
  });
  it('reshape retains handles and swap rows moves complete rows', () => {
    const { m, refs } = referenceMatrix();
    const alias = m;
    reshapeMatrix(m, 3, 2);
    expect([alias.rows, alias.columns]).toEqual([3, 2]);
    expect(getMatrixValue(m, 1, 0)).toBe(refs[2]);
    swapMatrixRows(m, 0, 2);
    expect(m.values).toEqual([refs[4], refs[5], refs[2], refs[3], refs[0], refs[1]]);
    expect(getMatrixValue(m, 2, 1)).toBe(refs[1]);
  });
  it.each([
    ['a', 'b', 'c', 'd', 'e', 'f'],
    [true, false, true, false, false, true],
  ])('reverse keeps rectangular primitive slots', (...cells) => {
    const m = createPineMatrix(2, 3, cells[0]);
    m.values = [...cells];
    reverseMatrix(m);
    expect(m.values).toEqual([...cells].reverse());
    expect([m.rows, m.columns]).toEqual([2, 3]);
  });
  it('reverse and concat keep shared UDT handles', () => {
    const { m, refs } = referenceMatrix();
    reverseMatrix(m);
    expect(getMatrixValue(m, 0, 0)).toBe(refs[5]);
    const tail = createPineMatrix(1, 3, refs[0]);
    tail.values = refs.slice(0, 3);
    concatMatrix(m, tail);
    expect([m.rows, m.columns]).toEqual([3, 3]);
    expect(m.values).toEqual([...refs].reverse().concat(refs.slice(0, 3)));
    expect(getMatrixValue(m, 2, 0)).toBe(refs[0]);
    setUdtField(refs[0], 'n', 41);
    expect(getUdtField(getMatrixValue(m, 2, 0) as ReturnType<typeof point>, 'n')).toBe(41);
    expect(tail.values).toEqual(refs.slice(0, 3));
  });
  it('color map copy detaches pairs and clear preserves external objects', () => {
    const a = point(3),
      b = point(9);
    const m = createPineMap<string, ReturnType<typeof point>>();
    putMapValue(m, '#ff0000', a);
    putMapValue(m, '#0000ff', b);
    const copied = copyMap(m);
    expect(getMapValue(copied, '#ff0000')).toBe(a);
    expect(removeMapValue(copied, '#0000ff')).toBe(b);
    expect(getMapSize(m)).toBe(2);
    setUdtField(a, 'n', 12);
    expect(getUdtField(getMapValue(copied, '#ff0000') as ReturnType<typeof point>, 'n')).toBe(12);
    const alias = m;
    clearMap(m);
    expect(getMapSize(alias)).toBe(0);
    expect(getMapSize(copied)).toBe(1);
    expect(getUdtField(b, 'n')).toBe(9);
  });
  it('put_all copies pairs while retaining shared UDT objects', () => {
    const a = point(4),
      b = point(7),
      m = createPineMap<string, ReturnType<typeof point>>(),
      source = createPineMap<string, ReturnType<typeof point>>();
    putMapValue(m, '#ff0000', a);
    putMapValue(source, '#0000ff', b);
    putAllMapValues(m, source);
    expect(getMapValue(m, '#0000ff')).toBe(b);
    expect(getMapValue(m, '#ff0000')).toBe(a);
    clearMap(source);
    expect(getMapSize(m)).toBe(2);
  });
});
describe('packet007 builtin admission', () => {
  for (const member of ['is_identity', 'is_symmetric', 'avg', 'mode', 'trace']) {
    it.each(['', 'id=4', 'id=array.new_int()', 'id=matrix.new<bool>(1,1,true)', 'id=matrix.new<string>(1,1,"x")'])(
      `${member} refuses omitted or nonnumeric ID %s`,
      (arg) => {
        expect(errors(`plot(matrix.${member}(${arg}))`)).not.toEqual([]);
      },
    );
    it.each(['int', 'float'])(`${member} admits named numeric %s`, (kind) => {
      expect(errors(`m=matrix.new<${kind}>(2,2,1)\nplot(matrix.${member}(id=m))\nplot(m.${member}())`)).toEqual([]);
    });
  }
  it.each(['bool', 'string', 'Point'])('rank admits documented any-matrix %s', (kind) => {
    const value = kind === 'bool' ? 'true' : kind === 'string' ? '"x"' : 'Point.new(3)';
    expect(errors(udt + `m=matrix.new<${kind}>(1,1,${value})\nplot(matrix.rank(id=m))\nplot(m.rank())`)).toEqual([]);
  });
  it('remove_row retains array<Point> namespace and method returns', () => {
    expect(
      errors(
        udt +
          'm=matrix.new<Point>(2,1,Point.new(2))\narray<Point> a=matrix.remove_row(row=0,id=m)\narray<Point> b=m.remove_row(row=0)\nplot(a.get(0).n+b.get(0).n)',
      ),
    ).toEqual([]);
  });
  it('generic map and concat named calls preserve templates', () => {
    expect(
      errors(
        udt +
          'm=map.new<color,Point>()\nm.put(color.red,Point.new(1))\nmap<color,Point> copied=map.copy(id=m)\nmap.put_all(id2=copied,id=m)\nm.put_all(id2=copied)\nPoint removed=map.remove(key=color.red,id=copied)\nmap.clear(id=m)\na=matrix.new<Point>(1,1,Point.new(2))\nb=matrix.new<Point>(1,1,Point.new(3))\nmatrix.concat(id2=b,id1=a)\na.concat(id2=b)\nplot(removed.n)',
      ),
    ).toEqual([]);
  });
  it.each(['input.int(0)', 'bar_index', 'input.string("n")', 'str.tostring(bar_index)'])(
    'sort_field refuses nonconst %s',
    (field) => {
      expect(
        errors(
          udt +
            `m=matrix.new<Point>(2,1,Point.new(2))\nf=${field}\nmatrix.sort(id=m,sort_field=f)\nm.sort(sort_field=f)`,
        ),
      ).not.toEqual([]);
    },
  );
  it.each(['0', '"n"'])('sort_field admits const %s', (field) => {
    expect(
      errors(
        udt +
          `m=matrix.new<Point>(2,1,Point.new(2))\nmatrix.sort(sort_field=${field},id=m)\nm.sort(sort_field=${field})`,
      ),
    ).toEqual([]);
  });
});

describe('packet007 compiled reference bindings and qualifiers', () => {
  it.each(['namespace', 'receiver'])('generic enum map bindings and changing keys %s', (form) => {
    const call = (name: string, args: string) =>
      form === 'namespace' ? `map.${name}(id=m,${args})` : `m.${name}(${args})`;
    const copy = form === 'namespace' ? 'map.copy(id=m)' : 'm.copy()';
    const clear = form === 'namespace' ? 'map.clear(id=copied)' : 'copied.clear()';
    const source =
      udt +
      'enum Key\n    first\n    second\n' +
      'm=map.new<Key,Point>()\na=Point.new(3)\nb=Point.new(9)\nm.put(Key.first,a)\nm.put(Key.second,b)\n' +
      `map<Key,Point> copied=${copy}\nselected=bar_index%2==0?Key.first:Key.second\nPoint removed=${call('remove', 'key=selected')}\n` +
      `${clear}\nplot(removed.n,title="value")\nplot(m.size(),title="size")\nplot(a.n+b.n,title="external")`;
    expect(errors(source)).toEqual([]);
    const result = runCompatScript(header + source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual(Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 3 : 9)));
    expect(getPlot(result, 'size').values).toEqual(Array(12).fill(1));
    expect(getPlot(result, 'external').values).toEqual(Array(12).fill(12));
  });
  it.each(['namespace', 'receiver'])('changing color key removes exact pair %s', (form) => {
    const remove = form === 'namespace' ? 'map.remove(key=selected,id=m)' : 'm.remove(key=selected)';
    const source =
      udt +
      'm=map.new<color,Point>()\nm.put(color.red,Point.new(4))\nm.put(color.blue,Point.new(7))\nselected=bar_index%2==0?color.red:color.blue\n' +
      `Point removed=${remove}\nplot(removed.n,title="value")\nplot(m.size(),title="size")`;
    expect(errors(source)).toEqual([]);
    const result = runCompatScript(header + source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual(Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 4 : 7)));
    expect(getPlot(result, 'size').values).toEqual(Array(12).fill(1));
  });
  for (const form of ['namespace', 'receiver']) {
    it.each(['input', 'simple', 'series'])(`sort order permutes complete rows ${form} %s`, (qualifier) => {
      const declaration =
        qualifier === 'input'
          ? 'descending=input.bool(true)\ndirection=descending?order.descending:order.ascending\n'
          : qualifier === 'simple'
            ? 'directionFor(simple bool descending) =>\n    descending?order.descending:order.ascending\ndirection=directionFor(true)\n'
            : 'direction=bar_index%2==0?order.descending:order.ascending\n';
      const call =
        form === 'namespace' ? 'matrix.sort(order=direction,column=0,id=m)' : 'm.sort(order=direction,column=0)';
      const source =
        declaration +
        'm=matrix.new<int>(2,2,0)\nm.set(0,0,9)\nm.set(0,1,90)\nm.set(1,0,1)\nm.set(1,1,10)\n' +
        call +
        '\nplot(m.get(0,0),title="first")\nplot(m.get(0,1),title="paired")';
      expect(errors(source)).toEqual([]);
      const result = runCompatScript(header + source);
      expect(result.errors).toEqual([]);
      const wanted = Array.from({ length: 12 }, (_, i) => (qualifier === 'series' && i % 2 === 1 ? 1 : 9));
      expect(getPlot(result, 'first').values).toEqual(wanted);
      expect(getPlot(result, 'paired').values).toEqual(wanted.map((x) => x * 10));
    });
  }
  it('eligible custom matrix sort retains nonconst own parameter', () => {
    const source =
      udt +
      'method sort(matrix<Point> self, series int sort_field) =>\n    sort_field\nm=matrix.new<Point>(1,1,Point.new(2))\nplot(m.sort(sort_field=bar_index),title="custom")';
    expect(errors(source)).toEqual([]);
    const result = runCompatScript(header + source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'custom').values).toEqual(Array.from({ length: 12 }, (_, i) => i));
  });
});

describe('packet007 exact generic templates', () => {
  it.each(['namespace', 'receiver'])('row removal keeps reference element identity %s', (form) => {
    const remove = form === 'namespace' ? 'matrix.remove_row(row=0,id=m)' : 'm.remove_row(row=0)';
    const source =
      udt +
      'a=Point.new(2)\nb=Point.new(7)\nm=matrix.new<Point>(2,1,a)\nm.set(1,0,b)\n' +
      `array<Point> removed=${remove}\na.n:=11\nplot(removed.get(0).n,title="removed")\nplot(m.get(0,0).n,title="surviving")`;
    expect(errors(source)).toEqual([]);
    const result = runCompatScript(header + source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'removed').values).toEqual(Array(12).fill(11));
    expect(getPlot(result, 'surviving').values).toEqual(Array(12).fill(7));
  });
  it.each(['int', 'float'])('rank admits numeric named/receiver %s', (kind) => {
    expect(errors(`m=matrix.new<${kind}>(2,2,1)\nplot(matrix.rank(id=m))\nplot(m.rank())`)).toEqual([]);
  });
  it.each(['int', 'string'])('sort_field refuses simple %s', (kind) => {
    const literal = kind === 'int' ? '0' : '"n"';
    const source =
      udt +
      `identity(simple ${kind} field) =>\n    field\nf=identity(${literal})\nm=matrix.new<Point>(1,1,Point.new(2))\nmatrix.sort(id=m,sort_field=f)\nm.sort(sort_field=f)`;
    expect(errors(source).filter((d) => d.code === 'qualifier-mismatch')).toHaveLength(2);
  });
});
