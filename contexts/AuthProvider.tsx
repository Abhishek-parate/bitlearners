// contexts/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from "../lib/supabase";
import { router } from 'expo-router';
import { SessionManager } from '../lib/session-manager';

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

  // Load the initial session
  useEffect(() => {
    let mounted = true;
    
    const getInitialSession = async () => {
      try {
        console.log('Initializing auth session...');
        
        // Check for stored session first
        const storedSession = await SessionManager.getSession();
        
        if (storedSession) {
          console.log('Found stored session, using it...');
          if (mounted) {
            setSession(storedSession);
            setUser(storedSession.user);
            if (storedSession.user) {
              await fetchProfile(storedSession.user.id);
            }
          }
        } else {
          // No stored session, get from Supabase
          console.log('No stored session, checking with Supabase...');
          const { data } = await supabase.auth.getSession();
          
          if (mounted) {
            setSession(data.session);
            setUser(data.session?.user || null);
            
            if (data.session) {
              // Store the new session
              await SessionManager.storeSession(data.session);
              
              if (data.session.user) {
                await fetchProfile(data.session.user.id);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Set up the auth state listener
    const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event);
      
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user || null);
        
        if (newSession) {
          // Store the updated session
          await SessionManager.storeSession(newSession);
          
          if (newSession.user) {
            await fetchProfile(newSession.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear session on sign out
          await SessionManager.clearSession();
          setProfile(null);
        }
        
        // Handle navigation based on auth state
        if (event === 'SIGNED_IN') {
          router.replace('/');
        } else if (event === 'SIGNED_OUT') {
          router.replace('/login');
        }
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

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
      console.log('Attempting to sign in...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Explicitly store session
      if (data.session) {
        await SessionManager.storeSession(data.session);
        console.log('Session stored after sign in');
      }
    } catch (error: any) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, username: string) => {
    try {
      setLoading(true);
      console.log('Attempting to sign up...');
      
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
        
        // If we got a session, store it
        if (data.session) {
          await SessionManager.storeSession(data.session);
          console.log('Session stored after sign up');
        }
      }
    } catch (error: any) {
      console.error('Error signing up:', error);
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
    } catch (error) {
      console.error('Error signing out:', error);
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