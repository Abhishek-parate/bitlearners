// app/(root)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { useAuth } from '../../contexts/AuthProvider'; // Make sure this path is correct for your project
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      // User is not authenticated, redirect to login
      console.log("Root layout detected no session, redirecting to login");
      router.replace('/(auth)/login');
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
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="budget" options={{ presentation: 'modal' }} />
      <Stack.Screen name="expense" options={{ presentation: 'modal' }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
    </Stack>
  );
}