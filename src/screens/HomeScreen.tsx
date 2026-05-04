import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? dark : light;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Capture documents for your loan application
      </Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        Open the scanner to capture your document; you can adjust corners on
        supported devices before saving the flattened image.
      </Text>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => navigation.navigate('DocumentScan')}>
        <Text style={styles.primaryButtonText}>Scan document</Text>
      </Pressable>
    </View>
  );
}

const light = {
  bg: '#f5f6f8',
  text: '#111827',
  muted: '#4b5563',
  accent: '#2563eb',
};

const dark = {
  bg: '#111827',
  text: '#f9fafb',
  muted: '#9ca3af',
  accent: '#3b82f6',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
});
