import frontendConfig from '../../eslint.config.frontend.mjs';

export default [
  ...frontendConfig,
  {
    ignores: ['oracle-probes/**', 'src/parser/generated.js', 'src/parser/generated.d.ts'],
  },
];
