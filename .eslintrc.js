module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'import', 'jest'],
  extends: [
    'plugin:@typescript-eslint/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'jest.config.js'],
  rules: {
    "sort-imports": [
      "error",
      {
        "ignoreCase": true,
        "ignoreDeclarationSort": true
      }
    ],
    "import/order": [1, {
      "groups": [
        "builtin",
        "external",
        "internal",
        "parent",
        "sibling",
        "index"
      ],
      pathGroups: [
        {
          pattern: '@nestjs/**',
          group: 'external',
          position: 'before',
        },
        {
          pattern: '@pipecraft/**',
          group: 'internal',
        },
        {
          pattern: '@/db/**',
          group: 'parent',
        },
        {
          pattern: '@/**',
          group: 'sibling',
        }
      ],
    }],
    'jest/no-hooks': 'off',
    'jest/prefer-expect-assertions': 0,
    'jest/no-truthy-falsy': 0,
    'jest/no-restricted-matchers': [
      'error',
      {
        toBeTruthy: 'Avoid `toBeTruthy`',
        toBeFalsy: 'Avoid `toBeFalsy`',
      },
    ],
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
    semi: ["error", "always"],
    "semi-spacing": ["error", {"before": false, "after": true}],
    "comma-dangle": ["error", "always-multiline"],
    "array-element-newline": ["error", {
      "ArrayExpression": "consistent",
      "ArrayPattern": { "minItems": 3 },
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
