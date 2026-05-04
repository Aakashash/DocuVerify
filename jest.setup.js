/* eslint-env jest */
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    readFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

jest.mock('@bam.tech/react-native-image-resizer', () => ({
  __esModule: true,
  default: {
    createResizedImage: jest.fn(),
  },
}));

jest.mock('react-native-document-scanner-plugin', () => {
  const ResponseType = {
    Base64: 'base64',
    ImageFilePath: 'imageFilePath',
  };
  const ScanDocumentResponseStatus = {
    Cancel: 'cancel',
    Success: 'success',
  };
  return {
    __esModule: true,
    default: {
      scanDocument: jest.fn(() =>
        Promise.resolve({
          status: ScanDocumentResponseStatus.Cancel,
          scannedImages: [],
        }),
      ),
    },
    ResponseType,
    ScanDocumentResponseStatus,
  };
});
