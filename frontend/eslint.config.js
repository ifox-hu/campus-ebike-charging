import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['**/node_modules/**', '**/dist*/**', '**/.playwright-cli/**', '**/e2e/**'] },
  js.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.{js,mjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        uni: 'readonly',
        wx: 'readonly',
        my: 'readonly',
        plus: 'readonly',
        getCurrentPages: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrors: 'none', varsIgnorePattern: '^_' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/tests/**', '**/*.config.{js,mjs}', '**/vite.config.js'],
    languageOptions: { globals: globals.node },
  },
  prettier,
];
