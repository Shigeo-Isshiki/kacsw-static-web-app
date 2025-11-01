// ESLint flat config for v9+: integrates eslint-plugin-prettier
// This config enables basic rules and runs Prettier as an ESLint rule.
// Ensure `eslint-plugin-prettier` is installed in devDependencies.
module.exports = [
  {
    ignores: ["node_modules/**", "dist/**"]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly'
      }
    },
    plugins: {
      prettier: require('eslint-plugin-prettier')
    },
    rules: {
      // Run Prettier as an ESLint rule to report formatting issues
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          trailingComma: 'es5',
          semi: true,
          printWidth: 100,
          tabWidth: 2
        }
      ],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off'
    }
  }
];
