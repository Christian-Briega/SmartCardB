module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          rootDir: '.',
          isolatedModules: true,
          types: ['jest', 'node'],
        },
      },
    ],
  },
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__tests__/__mocks__/react-native.js',
    '^expo-secure-store$': '<rootDir>/__tests__/__mocks__/expo-secure-store.js',
    '^expo-crypto$': '<rootDir>/__tests__/__mocks__/expo-crypto.js',
  },
};

