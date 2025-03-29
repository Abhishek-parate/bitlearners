// src/contexts/AuthProvider.tsx

import { supabase } from "@/utils/supabase";
import { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ActivityIndicator, View, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error fetching session:", error);
        }
        
        setSession(session);
      } catch (e) {
        console.error('Error in session retrieval:', e);
      } finally {
        setIsReady(true);
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setSession(session);
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Check if user profile exists
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        
        // If no profile exists, create one
        if (!profile && !error) {
          await supabase
            .from('profiles')
            .insert([{
              id: session.user.id,
              status: 'online',
              created_at: new Date().toISOString()
            }]);
        }
        
        // Navigate to main app
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 800);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert("Logout Failed", error.message);
      }
    } catch (e) {
      console.error('Error during logout:', e);
    }
  };

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0061FF" />
      </View>
    );
  }

  return (
    <AuthContext.Provider 
      value={{ 
        session, 
        user: session?.user ?? null, 
        isAuthenticated: !!session?.user,
        logout 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};