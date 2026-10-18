import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const babel = require('@babel/core') as { transformSync(source: string, options: unknown): { code: string } };
type TypeArgumentPath = { node: { typeParameters?: unknown; superTypeParameters?: unknown } };

function removeLegacyTypeArguments() {
  return {
    name: 'remove-legacy-typescript-type-arguments',
    visitor: {
      Program(path: { traverse(visitors: Record<string, (path: TypeArgumentPath) => void>): void }) {
        // Babel 7 parses typeParameters; Babel 8 erases typeArguments instead.
        // Erase legacy arguments before Worklets serializes any function body.
        path.traverse({
          'CallExpression|OptionalCallExpression|NewExpression|JSXOpeningElement|TaggedTemplateExpression'(path) {
            delete path.node.typeParameters;
          },
          'ClassDeclaration|ClassExpression'(path) {
            delete path.node.superTypeParameters;
          },
        });
      },
    },
  };
}

export function transformNativeWorklet(source: string, filename: string): string {
  return babel.transformSync(source, {
    filename,
    configFile: false,
    babelrc: false,
    plugins: [
      removeLegacyTypeArguments,
      '@babel/plugin-transform-typescript',
      'react-native-worklets/plugin',
      ...(filename.endsWith('.tsx') ? [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]] : []),
      '@babel/plugin-transform-modules-commonjs',
    ],
  }).code;
}
