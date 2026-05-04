module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|@react-navigation|react-native-document-scanner-plugin|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|jpeg-js|react-native-fs|@bam.tech/react-native-image-resizer|@react-native-ml-kit/text-recognition)',
  ],
};
