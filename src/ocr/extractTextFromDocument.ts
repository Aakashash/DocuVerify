import TextRecognition from '@react-native-ml-kit/text-recognition';

/**
 * Runs on-device ML Kit text recognition on a local image path or file URI.
 */
export async function extractTextFromDocument(
  imagePathOrUri: string,
): Promise<string> {
  const uri = imagePathOrUri.startsWith('file://')
    ? imagePathOrUri
    : `file://${imagePathOrUri}`;
  const result = await TextRecognition.recognize(uri);
  return (result.text ?? '').trim();
}
