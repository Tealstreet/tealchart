import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
    // Ignore patterns
    {
        ignores: [
            'prettier.config.js',
            '.next/**',
            'node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/yargs-parser/**',
            'thirdparty/paradex.js/**',
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/*.spec.ts',
            '**/*.spec.tsx',
            '**/public/static/charting_library/**',
        ],
    },

    // Base configuration for JS files
    {
        files: ['**/*.js', '**/*.jsx'],
        ...js.configs.recommended,
        languageOptions: {
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                // Node.js globals
                require: 'readonly',
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                exports: 'readonly',
                // Browser globals
                console: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                fetch: 'readonly',
                FormData: 'readonly',
                Blob: 'readonly',
                File: 'readonly',
                FileReader: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                WebSocket: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
            },
        },
    },

    // TypeScript configuration
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                // Node.js globals
                require: 'readonly',
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                exports: 'readonly',
                // Browser globals
                console: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                fetch: 'readonly',
                FormData: 'readonly',
                Blob: 'readonly',
                File: 'readonly',
                FileReader: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                WebSocket: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        plugins: {
            '@typescript-eslint': typescript,
            react: react,
            'react-hooks': reactHooks,
        },
        rules: {
            ...typescript.configs.recommended.rules,
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_|^T$',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            'react/no-unknown-property': ['error', { ignore: ['css'] }],
        },
    },

    // Global rules for all files
    {
        files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: 'lodash',
                            message: 'Import [module] from lodash/[module] instead',
                        },
                        {
                            name: 'antd',
                            message: 'Import [module] from antd/es/[module] instead',
                        },
                        {
                            name: 'jotai/index',
                            message: 'Import from jotai instead',
                        },
                        {
                            name: '@fortawesome/free-solid-svg-icons',
                            message: 'Prefer named imports from @fortawesome/free-solid-svg-icons',
                        },
                        {
                            name: '@fortawesome/free-regular-svg-icons',
                            message: 'Prefer named imports from @fortawesome/free-regular-svg-icons',
                        },
                        {
                            name: 'react-icons',
                            message: 'Do not use react-icons, use the icons in the components/ui/icons folder instead',
                        },
                    ],
                },
            ],
        },
    },
];
