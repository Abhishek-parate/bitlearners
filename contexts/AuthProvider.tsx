// contexts/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from "../lib/supabase";
import { router } from 'expo-router';
import { SessionManager } from '../lib/session-manager';
import { Alert } from 'react-native';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

// Create the context with default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

// Create the provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the user's profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  // Load the initial session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // First try to get session from AsyncStorage
        const storedSession = await SessionManager.getSession();
        
        if (storedSession) {
          console.log('Found stored session, validating...');
          
          // Validate the stored session with Supabase
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          
          if (currentUser) {
            console.log('Stored session is valid');
            setSession(storedSession);
            setUser(currentUser);
            if (currentUser.id) {
              await fetchProfile(currentUser.id);
            }
          } else {
            console.log('Stored session expired, clearing...');
            await SessionManager.clearSession();
            
            // Try to get a fresh session
            const { data: { session: freshSession } } = await supabase.auth.getSession();
            if (freshSession) {
              console.log('Got fresh session from Supabase');
              setSession(freshSession);
              setUser(freshSession.user);
              await SessionManager.storeSession(freshSession);
              if (freshSession.user) {
                await fetchProfile(freshSession.user.id);
              }
            }
          }
        } else {
          // No stored session, check with Supabase
          console.log('No stored session, checking with Supabase...');
          const { data: { session: supabaseSession } } = await supabase.auth.getSession();
          
          if (supabaseSession) {
            console.log('Got session from Supabase');
            setSession(supabaseSession);
            setUser(supabaseSession.user);
            await SessionManager.storeSession(supabaseSession);
            if (supabaseSession.user) {
              await fetchProfile(supabaseSession.user.id);
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event);
      
      if (newSession) {
        // We have a session, update state and store session
        setSession(newSession);
        setUser(newSession.user);
        await SessionManager.storeSession(newSession);
        
        if (newSession.user) {
          await fetchProfile(newSession.user.id);
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          router.replace('/(root)');
        }
      } else if (event === 'SIGNED_OUT') {
        // Clear everything on sign out
        setSession(null);
        setUser(null);
        setProfile(null);
        await SessionManager.clearSession();
        router.replace('/(auth)/login');
      }
    });

    // Clean up the listener
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Refresh the profile
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Signing in...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      console.log('Sign in successful');
      
      // Explicitly store session
      if (data.session) {
        await SessionManager.storeSession(data.session);
        console.log('Session stored after sign in');
      }
    } catch (error: any) {
      console.error('Error signing in:', error);
      Alert.alert('Login Failed', error.message || 'Could not sign in. Please check your credentials.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, username: string) => {
    try {
      setLoading(true);
      console.log('Signing up...');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Create a new profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
            full_name: '',
            avatar_url: '',
          });

        if (profileError) throw profileError;
        
        if (data.session) {
          await SessionManager.storeSession(data.session);
          console.log('Session stored after sign up');
          
          // Set the session and user state
          setSession(data.session);
          setUser(data.user);
          
          Alert.alert('Success', 'Your account has been created! Please check your email to confirm your account.'); 
        }
      }
    } catch (error: any) {
      console.error('Error signing up:', error);
      Alert.alert('Registration Failed', error.message || 'Could not create account. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      
      // First, clear local session
      await SessionManager.clearSession();
      
      // Then, sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('Successfully signed out');
      
      // Reset auth state
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (error: any) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'There was a problem signing out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // The value that will be provided to consumers of this context
  const value = {
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create a hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;