module.exports = {
  verbose: true,
  moduleFileExtensions: [
    'js',
    'json',
    'ts'
  ],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '../../.tsconfig.base.json',
      },
    ],
  },
  collectCoverageFrom: [
    '**/*.(t|j)s'
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
  moduleNameMapper: {
  },
  setupFilesAfterEnv: [ 'jest-extended/all' ],
  testTimeout: 2 * 60 * 1000
};
