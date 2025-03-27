// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthProvider';

export default function AuthLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) {
      // User is authenticated, redirect to the main app
      console.log("Auth layout detected session, redirecting to home");
      router.replace('/(root)/(tabs)/'); // More specific path to home tab
    } else if (!loading) {
      console.log("No session detected, staying on auth screens");
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0061FF" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}