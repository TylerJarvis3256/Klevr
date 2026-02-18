import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import nextConfig from 'eslint-config-next'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
})

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'coverage/**',
      '*.config.{js,mjs,ts}',
      'postcss.config.*',
    ],
  },
  ...nextConfig,
  ...compat.extends(
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]

export default config
