import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  DocumentScan: undefined;
};

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
