import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  DocumentScan: undefined;
  LoanExtraction: {
    /** Local path from document scanner (no file:// required). */
    imagePath: string;
    /** URI suitable for <Image source={{ uri }}>. */
    displayUri: string;
  };
};

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
