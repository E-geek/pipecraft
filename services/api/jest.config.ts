import type { Config } from 'jest';

const config :Config = {
  verbose: true,
  moduleFileExtensions: [
    'js',
    'json',
    'ts'
  ],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        isolatedModules: true,
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
  moduleNameMapper: {
  },
  setupFilesAfterEnv: [ '<rootDir>/jest.setup.ts', 'jest-extended/all' ],
  testTimeout: 2 * 60 * 1000
};

export default config;
