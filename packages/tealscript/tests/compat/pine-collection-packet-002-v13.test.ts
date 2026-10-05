import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

const bars = [0, 1, 2].map((index) => ({
  time: 1700000000000 + index * 60000,
  open: 10,
  high: 12,
  low: 9,
  close: 11,
  volume: 100,
}));
const header = '//@version=6\nindicator("Collection packet002")\n';
const record = 'type Item\n    int value\n';
type Case = {
  ranks: number[];
  facet: string;
  title: string;
  body: string;
  values?: number[];
  diagnostic?: string;
  symbol?: { name: string; kind: string; element?: string; qualifier?: string };
};
const cases: Case[] = [];

for (const receiver of [false, true]) {
  const call = (family: string, member: string, id: string, args = '') =>
    receiver ? `${id}.${member}(${args})` : `${family}.${member}(${id}${args ? ', ' + args : ''})`;
  for (const type of ['int', 'float']) {
    cases.push({
      ranks: [150, 153, 156, 159],
      facet: 'matrix-mult-operand-bindings',
      title: `reversed vector slots ${type} receiver=${receiver}`,
      body: `m = matrix.new<${type}>(2, 2, 0)\nm.set(0,0,2)\nm.set(0,1,3)\nm.set(1,0,5)\nm.set(1,1,7)\nv = array.from(11,13)\nresult = ${receiver ? 'm.mult(id2=v)' : 'matrix.mult(id2=v,id1=m)'}\nplot(result.get(0) * 1000 + result.get(1))`,
      values: [61146, 61146, 61146],
      symbol: { name: 'result', kind: 'array', element: type, qualifier: 'series' },
    });
    for (const bad of ['"bad"', 'true', 'array.from("bad")', 'matrix.new<string>(2,2,"bad")']) {
      cases.push({
        ranks: [150, 153, 156, 159],
        facet: 'matrix-mult-operand-bindings',
        title: `refuses ${bad} second operand ${type} receiver=${receiver}`,
        body: `m = matrix.new<${type}>(2,2,1)\n${call('matrix', 'mult', 'm', bad)}`,
        diagnostic: 'type-mismatch',
      });
    }
  }
  const q = {
    const: ['const int row=0\nconst int col=1', [91109, 91109, 91109]],
    input: ['input int row=input.int(0)\ninput int col=input.int(1)', [91109, 91109, 91109]],
    simple: ['simple int row=0\nsimple int col=1', [91109, 91109, 91109]],
    series: ['series int row=bar_index%2\nseries int col=(bar_index+1)%2', [91109, 92099, 91109]],
  } as const;
  for (const [qualifier, [decl, values]] of Object.entries(q)) {
    for (const named of [false, true]) {
      cases.push({
        ranks: [164, 165, 169, 170],
        facet: 'matrix-set-coordinate-qualifiers',
        title: `${qualifier} coordinates named=${named} receiver=${receiver}`,
        body: `${decl}\nm=matrix.new<int>(2,2,9)\n${named ? (receiver ? 'm.set(value=20,column=col,row=row)' : 'matrix.set(value=20,column=col,row=row,id=m)') : call('matrix', 'set', 'm', 'row,col,20')}\nplot(m.get(0,0)+m.get(0,1)*10+m.get(1,0)*100+m.get(1,1)*10000)`,
        values: [...values],
      });
    }
  }
  for (const missing of ['row', 'column']) {
    cases.push({
      ranks: [164, 165, 169, 170],
      facet: 'matrix-set-coordinate-qualifiers',
      title: `requires ${missing} receiver=${receiver}`,
      body: `m=matrix.new<int>(2,2,0)\n${receiver ? `m.set(${missing === 'row' ? 'column' : 'row'}=0,value=7)` : `matrix.set(id=m,${missing === 'row' ? 'column' : 'row'}=0,value=7)`}`,
      diagnostic: 'argument-count',
    });
  }
  for (const [type, initial, value, numeric] of [
    ['int', '3', '17', 'changed'],
    ['bool', 'false', 'true', 'changed ? 17 : 0'],
    ['string', '"old"', '"new"', 'changed == "new" ? 17 : 0'],
    ['color', 'color.red', 'color.blue', 'changed == color.blue ? 17 : 0'],
  ] as const) {
    cases.push({
      ranks: [163, 166, 171],
      facet: 'matrix-set-element-kind',
      title: `${type} exact slot and neighbor receiver=${receiver}`,
      body: `m=matrix.new<${type}>(1,2,${initial})\n${call('matrix', 'set', 'm', `0,1,${value}`)}\nchanged=m.get(0,1)\nplot(${numeric})\nplot(m.get(0,0)==${initial} ? 1 : 0,title="neighbor")`,
      values: [17, 17, 17],
    });
    const bad = type === 'string' ? '7' : '"bad"';
    cases.push({
      ranks: [163, 166, 171],
      facet: 'matrix-set-element-kind',
      title: `${type} mismatched value receiver=${receiver}`,
      body: `m=matrix.new<${type}>(1,2,${initial})\n${call('matrix', 'set', 'm', `0,1,${bad}`)}`,
      diagnostic: 'type-mismatch',
    });
    cases.push({
      ranks: [185, 186, 189],
      facet: 'unshift-element-assignability',
      title: `${type} unshift through alias receiver=${receiver}`,
      body: `a=array.new<${type}>(1,${initial})\nalias=a\n${call('array', 'unshift', 'a', value)}\nchanged=alias.get(0)\nplot(${numeric})\nplot(alias.size()*10+(alias.get(1)==${initial} ? 1 : 0),title="tail")`,
      values: [17, 17, 17],
    });
    cases.push({
      ranks: [185, 186, 189],
      facet: 'unshift-element-assignability',
      title: `${type} refuses incompatible unshift receiver=${receiver}`,
      body: `a=array.new<${type}>(1,${initial})\n${call('array', 'unshift', 'a', bad)}`,
      diagnostic: 'type-mismatch',
    });
    cases.push({
      ranks: [191, 192, 193, 194, 196, 197, 198],
      facet: 'remove-result-template-and-series',
      title: `${type} remove result and slots receiver=${receiver}`,
      body: `a=array.new<${type}>(2,${initial})\na.set(1,${value})\nresult=${call('array', 'remove', 'a', '1')}\nchanged=result\nplot(${numeric})\nplot(a.size()*10+(a.get(0)==${initial} ? 1 : 0),title="remaining")`,
      values: [17, 17, 17],
      symbol: { name: 'result', kind: type, qualifier: 'series' },
    });
  }
  for (const [type, value, numeric, expected] of [
    ['int', 'bar_index+17', 'changed', [17, 18, 19]],
    ['bool', 'bar_index%2==0', 'changed ? 17 : 0', [17, 0, 17]],
    ['string', 'str.tostring(bar_index)', 'changed==str.tostring(bar_index) ? 1 : 0', [1, 1, 1]],
    [
      'color',
      'bar_index%2==0 ? color.blue : color.green',
      'changed==(bar_index%2==0 ? color.blue : color.green) ? 1 : 0',
      [1, 1, 1],
    ],
  ] as const) {
    cases.push({
      ranks: [185, 186, 189],
      facet: 'unshift-element-assignability',
      title: `${type} changing series unshift receiver=${receiver}`,
      body: `a=array.new<${type}>()\nvalue=${value}\n${call('array', 'unshift', 'a', 'value')}\nchanged=a.get(0)\nplot(${numeric})`,
      values: [...expected],
    });
  }
  for (const [qualifier, declaration] of [
    ['const', 'const int index=1'],
    ['input', 'input int index=input.int(1)'],
    ['simple', 'simple int index=1'],
    ['series', 'series int index=bar_index%2'],
  ] as const) {
    cases.push({
      ranks: [195, 199],
      facet: 'remove-index-qualifiers',
      title: `${qualifier} remove index reversed named receiver=${receiver}`,
      body: `${declaration}\na=array.from(17,43)\nresult=${receiver ? 'a.remove(index=index)' : 'array.remove(index=index,id=a)'}\nplot(result*100+a.get(0))`,
      values: qualifier === 'series' ? [1743, 4317, 1743] : [4317, 4317, 4317],
    });
  }
  cases.push({
    ranks: [195, 199],
    facet: 'remove-index-qualifiers',
    title: `remove requires index receiver=${receiver}`,
    body: `a=array.from(17,43)\n${call('array', 'remove', 'a')}`,
    diagnostic: 'argument-count',
  });
  cases.push({
    ranks: [185, 186, 189],
    facet: 'unshift-element-assignability',
    title: `unshift requires value receiver=${receiver}`,
    body: `a=array.from(17,43)\n${call('array', 'unshift', 'a')}`,
    diagnostic: 'argument-count',
  });
  cases.push({
    ranks: [163, 166, 171],
    facet: 'matrix-set-element-kind',
    title: `Item exact slot and reference identity receiver=${receiver}`,
    body: `${record}old=Item.new(3)\nm=matrix.new<Item>(1,2,old)\nfresh=Item.new(17)\n${call('matrix', 'set', 'm', '0,1,fresh')}\nfresh.value:=19\nchanged=m.get(0,1)\nneighbor=m.get(0,0)\nplot(changed.value)\nplot(neighbor.value,title="neighbor")`,
    values: [19, 19, 19],
  });
  cases.push({
    ranks: [163, 166, 171],
    facet: 'matrix-set-element-kind',
    title: `Item rejects scalar set receiver=${receiver}`,
    body: `${record}m=matrix.new<Item>(1,2,Item.new(3))\n${call('matrix', 'set', 'm', '0,1,7')}`,
    diagnostic: 'type-mismatch',
  });
  cases.push({
    ranks: [185, 186, 189],
    facet: 'unshift-element-assignability',
    title: `Item unshift retains handle and alias receiver=${receiver}`,
    body: `${record}a=array.new<Item>(1,Item.new(3))\nalias=a\nfresh=Item.new(17)\n${call('array', 'unshift', 'a', 'fresh')}\nfresh.value:=19\nchanged=alias.get(0)\nplot(changed.value*10+alias.size())`,
    values: [192, 192, 192],
  });
  cases.push({
    ranks: [185, 186, 189],
    facet: 'unshift-element-assignability',
    title: `Item refuses scalar unshift receiver=${receiver}`,
    body: `${record}a=array.new<Item>()\n${call('array', 'unshift', 'a', '7')}`,
    diagnostic: 'type-mismatch',
  });
  cases.push({
    ranks: [191, 192, 193, 194, 196, 197, 198],
    facet: 'remove-result-template-and-series',
    title: `Item removed handle stays usable receiver=${receiver}`,
    body: `${record}a=array.from(Item.new(3),Item.new(17))\nresult=${call('array', 'remove', 'a', '1')}\nresult.value:=19\nremaining=a.get(0)\nplot(result.value*100+remaining.value*10+a.size())`,
    values: [1931, 1931, 1931],
    symbol: { name: 'result', kind: 'udt', qualifier: 'series' },
  });
  cases.push({
    ranks: [173],
    facet: 'clear-reference-elements',
    title: `clear retains referenced Item receiver=${receiver}`,
    body: `${record}item=Item.new(7)\na=array.from(item)\n${call('array', 'clear', 'a')}\nbefore=item.value\nitem.value:=19\nplot(before*100+item.value*10+a.size())`,
    values: [890, 890, 890],
  });
  cases.push({
    ranks: [200, 201, 202, 203, 204, 205, 206, 207],
    facet: 'copy-reference-elements',
    title: `shallow Item copy detached slots receiver=${receiver}`,
    body: `${record}item=Item.new(7)\na=array.from(item)\nresult=${call('array', 'copy', 'a')}\nshared=result.get(0)\nshared.value:=19\nresult.set(0,Item.new(31))\noriginal=a.get(0)\nreplacement=result.get(0)\nplot(original.value*100+replacement.value)`,
    values: [1931, 1931, 1931],
    symbol: { name: 'result', kind: 'array', element: 'udt', qualifier: 'series' },
  });
  cases.push({
    ranks: [200, 201, 202, 203, 204, 205, 206, 207],
    facet: 'copy-reference-elements',
    title: `empty defined Item copy receiver=${receiver}`,
    body: `${record}a=array.new<Item>()\nresult=${call('array', 'copy', 'a')}\nresult.push(Item.new(31))\nplot(a.size()*100+result.size())`,
    values: [1, 1, 1],
    symbol: { name: 'result', kind: 'array', element: 'udt', qualifier: 'series' },
  });
  cases.push({
    ranks: [208, 209, 210, 211],
    facet: 'matrix-copy-reference-elements',
    title: `shallow Item matrix copy detached slots receiver=${receiver}`,
    body: `${record}item=Item.new(7)\nm=matrix.new<Item>(1,2,item)\nresult=${call('matrix', 'copy', 'm')}\nshared=result.get(0,0)\nshared.value:=19\nresult.set(0,0,Item.new(31))\noriginal=m.get(0,0)\nreplacement=result.get(0,0)\nplot(original.value*100+replacement.value)\nplot(result.rows()*100+result.columns(),title="shape")`,
    values: [1931, 1931, 1931],
    symbol: { name: 'result', kind: 'matrix', element: 'udt', qualifier: 'series' },
  });
}
for (const [qualifier, size, seed, values] of [
  ['input', 'input int count=input.int(2)', 'input int seed=input.int(7)', [14, 14, 14]],
  ['simple', 'simple int count=2', 'simple int seed=7', [14, 14, 14]],
  ['series', 'series int count=bar_index+1', 'series int seed=bar_index+7', [7, 16, 27]],
] as const) {
  cases.push({
    ranks: [180, 181],
    facet: 'new-int-argument-qualifiers',
    title: `${qualifier} size and seed all slots`,
    body: `${size}\n${seed}\narray<int> result=array.new_int(initial_value=seed,size=count)\nplot(result.sum())\nplot(result.get(0)==seed and result.get(result.size()-1)==seed ? 1 : 0,title="slots")`,
    values: [...values],
    symbol: { name: 'result', kind: 'array', element: 'int', qualifier: 'series' },
  });
}
for (const seed of ['"bad"', 'true', '1.5', 'color.red'])
  cases.push({
    ranks: [180, 181],
    facet: 'new-int-argument-qualifiers',
    title: `new_int refuses ${seed} seed`,
    body: `array.new_int(initial_value=${seed},size=2)`,
    diagnostic: 'type-mismatch',
  });

cases.push(
  {
    ranks: [191, 192, 193, 194, 196, 197, 198],
    facet: 'remove-routing-controls',
    title: 'local same-name function preserves its own return',
    body: 'remove(int index) => "local"\nresult=remove(1)\nplot(result=="local" ? 1 : 0)',
    values: [1, 1, 1],
    symbol: { name: 'result', kind: 'string' },
  },
  {
    ranks: [191, 192, 193, 194, 196, 197, 198],
    facet: 'remove-routing-controls',
    title: 'eligible array user method preserves string result',
    body: 'method remove(array<int> id, string index) => "custom"\na=array.from(7,9)\nresult=a.remove("x")\nplot(result=="custom" ? a.size() : 0)',
    values: [2, 2, 2],
    symbol: { name: 'result', kind: 'string' },
  },
  {
    ranks: [180, 181],
    facet: 'new-int-routing-controls',
    title: 'local new_int function keeps string input and result',
    body: 'new_int(string initial_value) => initial_value\nresult=new_int("custom")\nplot(result=="custom" ? 1 : 0)',
    values: [1, 1, 1],
    symbol: { name: 'result', kind: 'string' },
  },
  {
    ranks: [180, 181],
    facet: 'new-int-routing-controls',
    title: 'eligible array receiver keeps new_int method',
    body: 'method new_int(array<int> id, string initial_value, int size) => initial_value\na=array.from(7)\nresult=a.new_int(initial_value="custom",size=2)\nplot(result=="custom" ? a.size() : 0)',
    values: [1, 1, 1],
    symbol: { name: 'result', kind: 'string' },
  },
  ...['array.new_int(2)', 'array.new_int(initial_value=na,size=2)'].map((body) => ({
    ranks: [180, 181],
    facet: 'new-int-routing-controls',
    title: `omitted/na seed ${body}`,
    body: `a=${body}\nplot(na(a.get(0)) and na(a.get(1)) ? a.size() : 0)`,
    values: [2, 2, 2],
  })),
);

for (const [member, args, ranks] of [
  ['matrix.set', 'row=0,column=0,value=7', [163]],
  ['array.clear', '', [173]],
  ['array.unshift', 'value=7', [185]],
  ['array.remove', 'index=0', [194]],
  ['array.copy', '', [204]],
  ['matrix.copy', '', [211]],
] as const)
  cases.push({
    ranks: [...ranks],
    facet: 'collection-source-kind-controls',
    title: `${member} refuses scalar source`,
    body: `${member}(id="bad"${args ? ',' + args : ''})`,
    diagnostic: 'type-mismatch',
  });

for (const receiver of [false, true]) {
  cases.push({
    ranks: [191, 192, 193, 194, 196, 197, 198],
    facet: 'remove-result-template-and-series',
    title: `float remove preserves fractional element receiver=${receiver}`,
    body: `a=array.from(3.5,17.5)\nresult=${receiver ? 'a.remove(1)' : 'array.remove(id=a,index=1)'}\nplot(result)`,
    values: [17.5, 17.5, 17.5],
    symbol: { name: 'result', kind: 'float', qualifier: 'series' },
  });
  for (const [qualifier, decl, values] of [
    ['const', 'const int value=17', [17, 17, 17]],
    ['input', 'input int value=input.int(17)', [17, 17, 17]],
    ['simple', 'simple int value=17', [17, 17, 17]],
    ['series', 'series int value=bar_index+17', [17, 18, 19]],
  ] as const)
    cases.push({
      ranks: [166, 171],
      facet: 'matrix-set-element-kind',
      title: `${qualifier} value retains selected slot receiver=${receiver}`,
      body: `${decl}\nm=matrix.new<int>(1,2,3)\n${receiver ? 'm.set(value=value,column=1,row=0)' : 'matrix.set(value=value,id=m,column=1,row=0)'}\nplot(m.get(0,1))\nplot(m.get(0,0)==3 ? 1 : 0,title="neighbor")`,
      values: [...values],
    });
}
cases.push({
  ranks: [180, 181],
  facet: 'new-int-argument-qualifiers',
  title: 'const size and seed all slots',
  body: 'const int count=2\nconst int seed=7\nresult=array.new_int(initial_value=seed,size=count)\nplot(result.sum())\nplot(result.get(0)==seed and result.get(result.size()-1)==seed ? 1 : 0,title="slots")',
  values: [14, 14, 14],
  symbol: { name: 'result', kind: 'array', element: 'int', qualifier: 'series' },
});

cases.push(
  {
    ranks: [180, 181],
    facet: 'new-int-namespace-controls',
    title: 'namespace constructor still checks seed beside value named array',
    body: 'array=array.from(7)\narray.new_int(size=2,initial_value="bad")',
    diagnostic: 'type-mismatch',
  },
  {
    ranks: [180, 181],
    facet: 'new-int-namespace-controls',
    title: 'namespace constructor still checks seed beside parameter named array',
    body: 'f(array<int> array) =>\n    array.new_int(size=2,initial_value="bad")\nresult=f(array.from(7))',
    diagnostic: 'type-mismatch',
  },
  {
    ranks: [180, 181],
    facet: 'new-int-namespace-controls',
    title: 'namespace constructor accepts correct seed beside value named array',
    body: 'array=array.from(7)\nresult=array.new_int(size=2,initial_value=11)\nplot(result.sum())',
    values: [22, 22, 22],
    symbol: { name: 'result', kind: 'array', element: 'int', qualifier: 'series' },
  },
);

describe('collection packet002 v13 remaining contracts', () => {
  for (const c of cases) {
    it(`${c.facet}: ${c.title} [${c.ranks.join(',')}]`, () => {
      const ast = parse(header + c.body);
      const checked = checkProgram(ast);
      const errors = checked.diagnostics.filter((d) => d.severity === 'error');
      if (c.diagnostic) {
        expect(
          errors.some((d) => d.code === c.diagnostic),
          JSON.stringify(errors),
        ).toBe(true);
        return;
      }
      expect(errors).toEqual([]);
      if (c.symbol) {
        const t = checked.symbols.find((s) => s.name === c.symbol!.name)?.type;
        expect(t?.kind).toBe(c.symbol.kind);
        if (c.symbol.qualifier) expect(t?.qualifier).toBe(c.symbol.qualifier);
        if (c.symbol.element) expect(t?.elementType?.kind).toBe(c.symbol.element);
        if (c.symbol.element === 'udt') expect(t?.elementType?.name).toBe('Item');
        if (c.symbol.kind === 'udt') expect(t?.name).toBe('Item');
      }
      const result = executeScript(ast, bars);
      expect(result.errors).toEqual([]);
      expect(result.plots[0]?.values).toEqual(c.values);
      if (c.facet === 'matrix-set-element-kind')
        expect(result.plots[1]?.values).toEqual(c.title.startsWith('Item ') ? [3, 3, 3] : [1, 1, 1]);
      if (c.title.includes('unshift through alias')) expect(result.plots[1]?.values).toEqual([21, 21, 21]);
      if (c.title.includes('remove result and slots')) expect(result.plots[1]?.values).toEqual([11, 11, 11]);
      if (c.facet === 'matrix-copy-reference-elements') expect(result.plots[1]?.values).toEqual([102, 102, 102]);
      if (c.title.includes('size and seed all slots')) expect(result.plots[1]?.values).toEqual([1, 1, 1]);
    });
  }
});
