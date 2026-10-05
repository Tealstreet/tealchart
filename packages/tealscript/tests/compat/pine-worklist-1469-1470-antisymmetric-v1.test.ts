import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

// Documented authority only: no exact non-square native capture is claimed.
describe('pine-worklist-1469-1470-antisymmetric-v1', () => {
  registerCollectionReferenceCases([
    {
      name: 'int namespace rectangular false square controls',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.is_antisymmetric',
      rejects: 'admitting a non-square matrix, swapping shape, or constant false',
      source:
        'wide = matrix.new<int>(1, 2, 0)\ntall = matrix.new<int>(2, 1, 0)\nsquare = matrix.new<int>(2, 2, 0)\nsquare.set(0, 1, 7)\nsquare.set(1, 0, -7)\nwrong = matrix.new<int>(2, 2, 1)',
      expressions: [
        'matrix.is_antisymmetric(wide) ? 1 : 0',
        'matrix.is_antisymmetric(tall) ? 1 : 0',
        'matrix.is_antisymmetric(square) ? 1 : 0',
        'matrix.is_antisymmetric(wrong) ? 1 : 0',
      ],
      expected: [0, 0, 1, 0],
    },
    {
      name: 'int method rectangular false square controls',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.is_antisymmetric',
      rejects: 'admitting a non-square matrix, swapping shape, or constant false',
      source:
        'wide = matrix.new<int>(1, 2, 0)\ntall = matrix.new<int>(2, 1, 0)\nsquare = matrix.new<int>(2, 2, 0)\nsquare.set(0, 1, 7)\nsquare.set(1, 0, -7)\nwrong = matrix.new<int>(2, 2, 1)',
      expressions: [
        'wide.is_antisymmetric() ? 1 : 0',
        'tall.is_antisymmetric() ? 1 : 0',
        'square.is_antisymmetric() ? 1 : 0',
        'wrong.is_antisymmetric() ? 1 : 0',
      ],
      expected: [0, 0, 1, 0],
    },
    {
      name: 'float namespace rectangular false square controls',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.is_antisymmetric',
      rejects: 'admitting a non-square matrix, swapping shape, or constant false',
      source:
        'wide = matrix.new<float>(1, 2, 0)\ntall = matrix.new<float>(2, 1, 0)\nsquare = matrix.new<float>(2, 2, 0)\nsquare.set(0, 1, 7)\nsquare.set(1, 0, -7)\nwrong = matrix.new<float>(2, 2, 1)',
      expressions: [
        'matrix.is_antisymmetric(wide) ? 1 : 0',
        'matrix.is_antisymmetric(tall) ? 1 : 0',
        'matrix.is_antisymmetric(square) ? 1 : 0',
        'matrix.is_antisymmetric(wrong) ? 1 : 0',
      ],
      expected: [0, 0, 1, 0],
    },
    {
      name: 'float method rectangular false square controls',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.is_antisymmetric',
      rejects: 'admitting a non-square matrix, swapping shape, or constant false',
      source:
        'wide = matrix.new<float>(1, 2, 0)\ntall = matrix.new<float>(2, 1, 0)\nsquare = matrix.new<float>(2, 2, 0)\nsquare.set(0, 1, 7)\nsquare.set(1, 0, -7)\nwrong = matrix.new<float>(2, 2, 1)',
      expressions: [
        'wide.is_antisymmetric() ? 1 : 0',
        'tall.is_antisymmetric() ? 1 : 0',
        'square.is_antisymmetric() ? 1 : 0',
        'wrong.is_antisymmetric() ? 1 : 0',
      ],
      expected: [0, 0, 1, 0],
    },
  ]);
});
