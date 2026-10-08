export interface ScaledSingularValueDecomposition {
  scale: number;
  columns: number[][];
  rightVectors: number[][];
  singularValues: number[];
}

function innerProduct(left: number[], right: number[]): number {
  let sum = 0;
  let correction = 0;
  for (let i = 0; i < left.length; i++) {
    const product = left[i] * right[i];
    const next = sum + product;
    correction += Math.abs(sum) >= Math.abs(product) ? sum - next + product : product - next + sum;
    sum = next;
  }
  return sum + correction;
}

function rotateColumns(left: number[], right: number[], cosine: number, sine: number): void {
  for (let i = 0; i < left.length; i++) {
    const first = left[i];
    const second = right[i];
    left[i] = cosine * first - sine * second;
    right[i] = sine * first + cosine * second;
  }
}

export function decomposeSingularValues(rows: number[][]): ScaledSingularValueDecomposition {
  const count = rows[0]?.length ?? 0;
  let scale = 0;
  for (const row of rows) {
    for (const value of row) scale = Math.max(scale, Math.abs(value));
  }
  const columns = Array.from({ length: count }, (_, column) =>
    rows.map((row) => (scale === 0 ? 0 : row[column] / scale)),
  );
  const rightVectors = Array.from({ length: count }, (_, column) =>
    Array.from({ length: count }, (_, row) => (row === column ? 1 : 0)),
  );
  for (let sweep = 0; sweep < 64; sweep++) {
    let rotated = false;
    for (let p = 0; p < count; p++) {
      for (let q = p + 1; q < count; q++) {
        const alpha = innerProduct(columns[p], columns[p]);
        const beta = innerProduct(columns[q], columns[q]);
        const gamma = innerProduct(columns[p], columns[q]);
        if (Math.abs(gamma) <= 8 * Number.EPSILON * Math.sqrt(alpha) * Math.sqrt(beta)) continue;
        const difference = beta - alpha;
        const denominator = difference + (difference < 0 ? -1 : 1) * Math.hypot(difference, 2 * gamma);
        const tangent = (2 * gamma) / denominator;
        const cosine = 1 / Math.hypot(1, tangent);
        const sine = cosine * tangent;
        rotateColumns(columns[p], columns[q], cosine, sine);
        rotateColumns(rightVectors[p], rightVectors[q], cosine, sine);
        rotated = true;
      }
    }
    if (!rotated) {
      const singularValues = columns.map((column) => column.reduce((norm, value) => Math.hypot(norm, value), 0));
      return { scale, columns, rightVectors, singularValues };
    }
  }
  throw new Error('Matrix singular-value decomposition did not converge');
}
