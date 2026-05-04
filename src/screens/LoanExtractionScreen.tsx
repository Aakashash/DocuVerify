import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { extractTextFromDocument } from '../ocr';
import { mapLoanFieldsFromText, type LoanFieldExtraction } from '../loan';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LoanExtraction'>;

export default function LoanExtractionScreen({ route }: Props) {
  const { displayUri, imagePath } = route.params;
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? dark : light;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<LoanFieldExtraction | null>(
    null,
  );

  const runExtraction = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExtraction(null);
    try {
      const raw = await extractTextFromDocument(imagePath);
      setExtraction(mapLoanFieldsFromText(raw));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Text recognition failed.');
    } finally {
      setLoading(false);
    }
  }, [imagePath]);

  useEffect(() => {
    void runExtraction();
  }, [runExtraction]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        { backgroundColor: colors.bg },
      ]}
      keyboardShouldPersistTaps="handled">
      <Text style={[styles.lead, { color: colors.text }]}>
        On-device OCR reads your scanned image. Structured fields below are
        pattern-based guesses for a loan workflow—always verify against the
        document.
      </Text>

      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={{ uri: displayUri }}
        style={[styles.thumb, { backgroundColor: colors.surface }]}
      />

      {loading ? (
        <View style={styles.centerRow}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[styles.hint, { color: colors.muted }]}>
            Reading text…
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.errorBox, { borderColor: colors.border }]}>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Could not read text
          </Text>
          <Text style={[styles.errorBody, { color: colors.muted }]}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.retry,
              { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={() => void runExtraction()}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {extraction && !loading ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Suggested loan fields
          </Text>
          <FieldRow label="Applicant name" value={extraction.applicantName} />
          <FieldList label="Email addresses" values={extraction.emails} />
          <FieldList label="Phone numbers" values={extraction.phones} />
          <FieldList label="Date-like text" values={extraction.possibleDates} />

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
            Notes
          </Text>
          {extraction.notes.map((n, i) => (
            <Text key={i} style={[styles.noteLine, { color: colors.muted }]}>
              • {n}
            </Text>
          ))}

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>
            Full OCR text
          </Text>
          <View
            style={[
              styles.rawBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <Text selectable style={[styles.rawText, { color: colors.text }]}>
              {extraction.rawText || '(empty)'}
            </Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? dark : light;
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: colors.text }]}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

function FieldList({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? dark : light;
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      {values.length === 0 ? (
        <Text style={[styles.fieldValue, { color: colors.text }]}>—</Text>
      ) : (
        values.map((v, i) => (
          <Text key={i} style={[styles.fieldValue, { color: colors.text }]}>
            {v}
          </Text>
        ))
      )}
    </View>
  );
}

const light = {
  bg: '#f5f6f8',
  text: '#111827',
  muted: '#4b5563',
  accent: '#2563eb',
  surface: '#e5e7eb',
  border: '#d1d5db',
};

const dark = {
  bg: '#111827',
  text: '#f9fafb',
  muted: '#9ca3af',
  accent: '#3b82f6',
  surface: '#1f2937',
  border: '#374151',
};

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  thumb: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 20,
  },
  centerRow: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  hint: {
    fontSize: 15,
  },
  errorBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  errorBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  retry: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 4,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  fieldRow: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    lineHeight: 22,
  },
  noteLine: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  rawBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  rawText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
