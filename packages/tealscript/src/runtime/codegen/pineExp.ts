// The same literal helper body serves compiled scripts and interpreted scalar calls.
export const PINE_EXP_RUNTIME_HELPER = `
function _exp(x) {
  if (Number.isNaN(x)) return NaN;
  if (x > 709.782712893384) return Number.isFinite(x) ? NaN : Infinity;
  if (x < -745.1332191019411) return 0;
  const k = Math.round(x / Math.LN2);
  let reducedHi, reducedLo, rHi, rLo;
{
    const p = (-k) * (0.6931471805599453), ca = 134217729 * (-k), cb = 134217729 * (0.6931471805599453);
    const ah = ca - (ca - (-k)), al = (-k) - ah, bh = cb - (cb - (0.6931471805599453)), bl = (0.6931471805599453) - bh;
    const e = ((ah * bh - p) + ah * bl + al * bh) + al * bl + (-k) * (2.3190468138462996e-17) + (0) * (0.6931471805599453);
    {
    const h = (p) + (e), v = h - (p);
    const l = ((p) - (h - v)) + ((e) - v) + (0) + (0);
    const s = h + l;
    reducedHi = s;
    reducedLo = l - (s - h);
  }
  }
{
    const h = (x) + (reducedHi), v = h - (x);
    const l = ((x) - (h - v)) + ((reducedHi) - v) + (0) + (reducedLo);
    const s = h + l;
    rHi = s;
    rLo = l - (s - h);
  }
  let termHi = 1, termLo = 0, sumHi = 1, sumLo = 0;
  for (let n = 1; n <= 24; n++) {
    let productHi, productLo;
{
    const p = (termHi) * (rHi), ca = 134217729 * (termHi), cb = 134217729 * (rHi);
    const ah = ca - (ca - (termHi)), al = (termHi) - ah, bh = cb - (cb - (rHi)), bl = (rHi) - bh;
    const e = ((ah * bh - p) + ah * bl + al * bh) + al * bl + (termHi) * (rLo) + (termLo) * (rHi);
    {
    const h = (p) + (e), v = h - (p);
    const l = ((p) - (h - v)) + ((e) - v) + (0) + (0);
    const s = h + l;
    productHi = s;
    productLo = l - (s - h);
  }
  }
{
    const q = (productHi) / (n);
    let negativeHi, negativeLo, residualHi, residualLo;
    {
    const p = (-q) * (n), ca = 134217729 * (-q), cb = 134217729 * (n);
    const ah = ca - (ca - (-q)), al = (-q) - ah, bh = cb - (cb - (n)), bl = (n) - bh;
    const e = ((ah * bh - p) + ah * bl + al * bh) + al * bl + (-q) * (0) + (0) * (n);
    {
    const h = (p) + (e), v = h - (p);
    const l = ((p) - (h - v)) + ((e) - v) + (0) + (0);
    const s = h + l;
    negativeHi = s;
    negativeLo = l - (s - h);
  }
  }
    {
    const h = (productHi) + (negativeHi), v = h - (productHi);
    const l = ((productHi) - (h - v)) + ((negativeHi) - v) + (productLo) + (negativeLo);
    const s = h + l;
    residualHi = s;
    residualLo = l - (s - h);
  }
    {
    const h = (q) + ((residualHi + residualLo) / (n)), v = h - (q);
    const l = ((q) - (h - v)) + (((residualHi + residualLo) / (n)) - v) + (0) + (0);
    const s = h + l;
    termHi = s;
    termLo = l - (s - h);
  }
  }
{
    const h = (sumHi) + (termHi), v = h - (sumHi);
    const l = ((sumHi) - (h - v)) + ((termHi) - v) + (sumLo) + (termLo);
    const s = h + l;
    sumHi = s;
    sumLo = l - (s - h);
  }
  }
  if (k > 1023) return ((sumHi + sumLo) * 2) * 2 ** 1023;
  if (k < -1022) return ((sumHi + sumLo) * 2 ** (k + 1022)) * 2 ** -1022;
  return (sumHi + sumLo) * 2 ** k;
}
`;

export const pineExp = new Function(`return (${PINE_EXP_RUNTIME_HELPER});`)() as (value: number) => number;
