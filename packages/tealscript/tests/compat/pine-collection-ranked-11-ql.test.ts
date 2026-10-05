import { describe, expect, it } from 'vitest';
import { createPineMatrix, eigenvectorsMatrixValue } from '../../src/runtime/matrices';
describe('collection11 symmetric implicit QL basis',()=>{
  it.each([
    {name:'opposite-sign roots',values:[0,2,0,2,0,0,0,0,1],roots:[-2,1,2]},
    {name:'dense distinct roots',values:[2,1,0,1,2,1,0,1,2],roots:[2-Math.SQRT2,2,2+Math.SQRT2]},
    {name:'repeated-root independent basis',values:[4,1,1,1,4,1,1,1,4],roots:[3,3,6]},
  ])('$name yields finite orthonormal columns and correct real eigenvalues',({values,roots})=>{
    const m=createPineMatrix<number>(3,3,0);m.values=[...values];
    const v=eigenvectorsMatrixValue(m);expect(v.rows).toBe(3);expect(v.columns).toBe(3);
    const columns=Array.from({length:3},(_,c)=>Array.from({length:3},(_,r)=>v.values[r*3+c]));
    const observed:number[]=[];
    for(const x of columns){
      expect(x.every(Number.isFinite)).toBe(true);
      const norm=x.reduce((a,b)=>a+b*b,0);expect(norm).toBeCloseTo(1,8);
      const ax=Array.from({length:3},(_,r)=>x.reduce((sum,value,c)=>sum+values[r*3+c]*value,0));
      const lambda=x.reduce((sum,value,r)=>sum+value*ax[r],0)/norm;
      for(let r=0;r<3;r++)expect(ax[r]).toBeCloseTo(lambda*x[r],8);
      observed.push(lambda);
    }
    for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)expect(columns[i].reduce((sum,value,r)=>sum+value*columns[j][r],0)).toBeCloseTo(0,8);
    observed.sort((a,b)=>a-b);for(let i=0;i<3;i++)expect(observed[i]).toBeCloseTo(roots[i],8);
    expect(m.values).toEqual(values);
  });
});
