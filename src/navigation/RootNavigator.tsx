import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DocumentScanScreen from '../screens/DocumentScanScreen';
import HomeScreen from '../screens/HomeScreen';
import LoanExtractionScreen from '../screens/LoanExtractionScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerTitleAlign: 'center',
          animation: 'slide_from_right',
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Loan documents' }}
        />
        <Stack.Screen
          name="DocumentScan"
          component={DocumentScanScreen}
          options={{ title: 'Scan document' }}
        />
        <Stack.Screen
          name="LoanExtraction"
          component={LoanExtractionScreen}
          options={{ title: 'Extracted details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
