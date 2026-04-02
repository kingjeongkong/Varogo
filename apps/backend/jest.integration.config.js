require('dotenv').config({ path: require('path').resolve(__dirname, '.env.test') });

/** @type {import('jest').Config} */
module.exports = {
  displayName: 'integration',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.integration.spec.ts'],
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
};
