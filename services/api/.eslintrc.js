module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/semi': ['error', 'always'],
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'quotes': ['error', 'single'],
    'object-curly-spacing': ['error', 'always', {
      'arraysInObjects': false,
      'objectsInObjects': false,
    }],
    'array-bracket-spacing': ['error', 'always', {
      'singleValue': true,
      'objectsInArrays': false,
      'arraysInArrays': false,
    }],
    '@typescript-eslint/type-annotation-spacing': ['error', {
      'before': true,
      'after': false,
      'overrides': {
        colon: {
          before: true,
          after: false,
        },
      },
    }],
  },
};
