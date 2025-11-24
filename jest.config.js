module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['nodes/**/*.ts'],
  coverageDirectory: '<rootDir>/coverage',
  clearMocks: true,
};
