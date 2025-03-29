// app/_layout.tsx
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { View, Text, ActivityIndicator } from 'react-native';

import "./global.css";
import AuthProvider from "../contexts/AuthProvider";
import { supabase } from "../lib/supabase";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  
  const [fontsLoaded] = useFonts({
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
  });

  // Check if Supabase is initialized
  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load/check any required resources here
        const { data } = await supabase.auth.getSession();
        console.log("Supabase initialized, session check:", data.session ? "Has session" : "No session");
      } catch (e) {
        console.error("Initialization error:", e);
      } finally {
        setAppIsReady(true);
      }
    }
    
    prepare();
  }, []);

  useEffect(() => {
    if (fontsLoaded && appIsReady) {
      // Hide splash screen once everything is ready
      SplashScreen.hideAsync().catch(() => {
        /* ignore errors */
      });
    }
  }, [fontsLoaded, appIsReady]);

  // Prevent rendering until resources are loaded
  if (!fontsLoaded || !appIsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0061FF" />
        <Text style={{ marginTop: 10, fontFamily: 'System', fontSize: 16 }}>
          Loading application...
        </Text>
      </View>
    );
  }

  // Return the root layout once everything is ready
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(root)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}