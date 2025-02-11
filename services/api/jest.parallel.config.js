module.exports = {
  verbose: true,
  moduleFileExtensions: [
    'js',
    'json',
    'ts',
  ],
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/$1',
  },
  rootDir: 'src',
  testRegex: '^((?!\\.seq).)*\\.spec\\.ts$',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  preset: 'ts-jest',
  clearMocks: true,
  coveragePathIgnorePatterns: [
    './node_modules/',
    '/config/',
    '/db/',
    '(.*).module.ts',
    '(.*).controller.ts',
    '(.*).spec.ts',
    'dist/',
  ],
  errorOnDeprecated: true,
  resetMocks: false,
  testLocationInResults: true,
  testPathIgnorePatterns: [ './node_modules/' ],
  reporters: [ 'default', 'jest-junit' ],
  globalSetup: '<rootDir>/jest.setup.ts',
  setupFilesAfterEnv: [ 'jest-extended/all' ],
  testTimeout: 2 * 60 * 1000,
};
