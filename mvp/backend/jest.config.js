module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '(apps|libs)/.*/test/.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { isolatedModules: true }] },
  testEnvironment: 'node',
  collectCoverageFrom: ['apps/**/src/**/*.ts', 'libs/**/src/**/*.ts', '!**/main.ts'],
  coverageDirectory: 'coverage',
};
