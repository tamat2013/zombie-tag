// App root: providers, intro animation, auth gate and the navigation stack.
import React, { useState } from 'react';
import { ActivityIndicator, I18nManager, Platform, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RootStackParamList } from './src/navigation/types';
import { GameProvider, useGame } from './src/state/GameContext';
import { ToastHost } from './src/components/ui';
import { RotateHint } from './src/components/RotateHint';
import { colors } from './src/theme';
import { IntroScreen } from './src/screens/IntroScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SkinSelectScreen } from './src/screens/SkinSelectScreen';
import { SkinDesignerScreen } from './src/screens/SkinDesignerScreen';
import { MapSelectScreen } from './src/screens/MapSelectScreen';
import { MapCreatorScreen } from './src/screens/MapCreatorScreen';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { GameScreen } from './src/screens/GameScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { ShopScreen } from './src/screens/ShopScreen';
import { MissionsScreen } from './src/screens/MissionsScreen';
import { TournamentsScreen } from './src/screens/TournamentsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

// Layouts are written with explicit row-reverse / right alignment for Hebrew,
// so keep the native layout direction LTR to avoid double-flipping.
if (Platform.OS !== 'web') {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.panel, text: colors.text, primary: colors.toxic, border: colors.border },
};

function Loading({ text }: { text: string }) {
  return (
    <View style={styles.loading}>
      <Text style={{ fontSize: 54 }}>🧟</Text>
      <ActivityIndicator color={colors.toxic} size="large" />
      <Text style={styles.loadingText}>{text}</Text>
    </View>
  );
}

function Root() {
  const { user, profile } = useGame();
  const [introDone, setIntroDone] = useState(false);

  if (!introDone) return <IntroScreen onDone={() => setIntroDone(true)} />;
  if (user === undefined) return <Loading text="טוען..." />;
  if (user && !profile) return <Loading text="טוען את הפרופיל..." />;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_left', contentStyle: { backgroundColor: colors.bg } }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ animation: 'fade' }} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="SkinSelect" component={SkinSelectScreen} />
            <Stack.Screen name="SkinDesigner" component={SkinDesignerScreen} />
            <Stack.Screen name="MapSelect" component={MapSelectScreen} />
            <Stack.Screen name="MapCreator" component={MapCreatorScreen} />
            <Stack.Screen name="Lobby" component={LobbyScreen} />
            <Stack.Screen name="Game" component={GameScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="Results" component={ResultsScreen} options={{ gestureEnabled: false, animation: 'fade_from_bottom' }} />
            <Stack.Screen name="Shop" component={ShopScreen} />
            <Stack.Screen name="Missions" component={MissionsScreen} />
            <Stack.Screen name="Tournaments" component={TournamentsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <View style={styles.app}>
          <StatusBar style="light" hidden />
          <Root />
          <ToastHost />
          <RotateHint />
        </View>
      </GameProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: colors.textDim, fontWeight: '700' },
});
