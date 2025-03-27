// app/(root)/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthProvider';

export default function TabsLayout() {
  const { user } = useAuth();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
        },
        tabBarActiveTintColor: '#0061FF',
        tabBarInactiveTintColor: '#8C8E98',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: 'Rubik-Medium',
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="budget/index"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="expense/index"
        options={{
          title: 'Add',
          tabBarLabel: () => null,
          tabBarIcon: ({ color, focused }) => (
            <View 
              className="w-14 h-14 -mt-8 rounded-full items-center justify-center"
              style={{ backgroundColor: '#0061FF' }}
            >
              <Ionicons name="add" size={30} color="white" />
            </View>
          ),
        }}
      />
      
      <Tabs.Screen
        name="explore"
        options={{
          title: 'AI',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flash-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="goals/create"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden screens */}
      <Tabs.Screen name="income/index" options={{ href: null }} />
      <Tabs.Screen name="budget/[id]" options={{ href: null }} />
      <Tabs.Screen name="budget/add" options={{ href: null }} />
      <Tabs.Screen name="budget/insights" options={{ href: null }} />
      <Tabs.Screen name="expense/[id]" options={{ href: null }} />
      <Tabs.Screen name="expense/add" options={{ href: null }} />
      <Tabs.Screen name="expense/edit/[id]" options={{ href: null }} />
      <Tabs.Screen name="reports/index" options={{ href: null }} />
      <Tabs.Screen name="income/add" options={{ href: null }} />
      <Tabs.Screen name="income/[id]" options={{ href: null }} />
      <Tabs.Screen name="income/edit/[id]" options={{ href: null }} />
    </Tabs>
  );
}