import { useNavigation } from '@react-navigation/native';
import DocumentScanner, {
  ResponseType,
  ScanDocumentResponseStatus,
} from 'react-native-document-scanner-plugin';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import type { RootStackParamList } from '../navigation/types';
import {
  assessDocumentImageQuality,
  type DocumentQualityResult,
} from '../quality';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

function toDisplayUri(path: string): string {
  if (path.startsWith('file://')) {
    return path;
  }
  return `file://${path}`;
}

export default function DocumentScanScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? dark : light;

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [scannedPath, setScannedPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assessingQuality, setAssessingQuality] = useState(false);
  const [quality, setQuality] = useState<DocumentQualityResult | null>(null);
  const [qualityOverride, setQualityOverride] = useState(false);

  const clearPreview = useCallback(() => {
    setPreviewUri(null);
    setScannedPath(null);
    setQuality(null);
    setQualityOverride(false);
    setAssessingQuality(false);
  }, []);

  const ensureCameraPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return true;
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera permission',
        message:
          'Camera access is required to scan documents. Please allow camera access to continue.',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  const runScan = useCallback(async () => {
    const allowed = await ensureCameraPermission();
    if (!allowed) {
      Alert.alert(
        'Permission needed',
        'Camera permission is required to scan documents.',
      );
      return;
    }

    setBusy(true);
    try {
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        croppedImageQuality: 92,
        maxNumDocuments: 1,
        responseType: ResponseType.ImageFilePath,
      });

      if (status === ScanDocumentResponseStatus.Cancel) {
        return;
      }

      const first = scannedImages?.[0];
      if (!first) {
        Alert.alert('Scan', 'No image was returned. Try again.');
        return;
      }

      setPreviewUri(toDisplayUri(first));
      setScannedPath(first);
      setQuality(null);
      setQualityOverride(false);
      setAssessingQuality(true);

      const q = await assessDocumentImageQuality(first);
      setQuality(q);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Scan failed.';
      Alert.alert('Scan error', message);
    } finally {
      setBusy(false);
      setAssessingQuality(false);
    }
  }, [ensureCameraPermission]);

  const showQualityBanner =
    previewUri &&
    quality?.ok &&
    quality.summary !== 'ok' &&
    !qualityOverride &&
    !assessingQuality;

  const qualityUnavailable =
    previewUri && quality && !quality.ok && !assessingQuality;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { backgroundColor: colors.bg },
      ]}
      keyboardShouldPersistTaps="handled">
      <Text style={[styles.lead, { color: colors.text }]}>
        The scanner opens full screen. Align your loan document; on Android you
        can adjust corners after capture if needed. The result below is cropped
        and perspective-corrected.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        style={({ pressed }) => [
          styles.primaryButton,
          {
            backgroundColor: colors.accent,
            opacity: busy ? 0.6 : pressed ? 0.85 : 1,
          },
        ]}
        onPress={runScan}>
        {busy ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Start scan</Text>
        )}
      </Pressable>

      {previewUri ? (
        <View style={styles.previewBlock}>
          <Text style={[styles.previewLabel, { color: colors.text }]}>
            Result (cropped)
          </Text>
          {assessingQuality ? (
            <View
              style={[
                styles.qualityRow,
                { backgroundColor: colors.surface },
              ]}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.qualityHint, { color: colors.muted }]}>
                Checking image quality…
              </Text>
            </View>
          ) : null}

          {showQualityBanner ? (
            <View
              style={[
                styles.qualityBanner,
                {
                  backgroundColor: colors.warnBg,
                  borderColor: colors.warnBorder,
                },
              ]}>
              <Text style={[styles.qualityBannerTitle, { color: colors.warnText }]}>
                Quality advisory
              </Text>
              {quality.messages.map((m, i) => (
                <Text
                  key={i}
                  style={[styles.qualityBannerBody, { color: colors.warnText }]}>
                  {m}
                </Text>
              ))}
              <View style={styles.qualityActions}>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.bannerButton,
                    styles.bannerButtonSecondary,
                    {
                      borderColor: colors.warnBorder,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() => {
                    clearPreview();
                    void runScan();
                  }}>
                  <Text
                    style={[styles.bannerButtonSecondaryText, { color: colors.warnText }]}>
                    Retake
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.bannerButton,
                    {
                      backgroundColor: colors.accent,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                  onPress={() => setQualityOverride(true)}>
                  <Text style={styles.bannerButtonPrimaryText}>Use anyway</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {qualityUnavailable && !quality.ok ? (
            <Text style={[styles.qualityHint, { color: colors.muted }]}>
              Image quality could not be analyzed ({quality.error}). You can
              still use this scan.
            </Text>
          ) : null}

          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={{ uri: previewUri }}
            style={[styles.previewImage, { backgroundColor: colors.surface }]}
          />
          {scannedPath && !assessingQuality ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: colors.accent,
                  marginBottom: 12,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              onPress={() =>
                navigation.navigate('LoanExtraction', {
                  imagePath: scannedPath,
                  displayUri: previewUri,
                })
              }>
              <Text style={styles.primaryButtonText}>
                Extract text for loan application
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={clearPreview}>
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Clear preview
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const light = {
  bg: '#f5f6f8',
  text: '#111827',
  muted: '#4b5563',
  accent: '#2563eb',
  surface: '#e5e7eb',
  border: '#d1d5db',
  warnBg: '#fffbeb',
  warnBorder: '#fcd34d',
  warnText: '#92400e',
};

const dark = {
  bg: '#111827',
  text: '#f9fafb',
  muted: '#9ca3af',
  accent: '#3b82f6',
  surface: '#1f2937',
  border: '#374151',
  warnBg: '#422006',
  warnBorder: '#b45309',
  warnText: '#fde68a',
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  previewBlock: {
    gap: 12,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  qualityHint: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  qualityBanner: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  qualityBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  qualityBannerBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  qualityActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  bannerButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  bannerButtonPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  bannerButtonSecondary: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
