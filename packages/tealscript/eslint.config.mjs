import frontendConfig from '../../eslint.config.frontend.mjs';

export default [
  ...frontendConfig,
  {
    ignores: ['src/parser/generated.js', 'src/parser/generated.d.ts'],
  },
];
