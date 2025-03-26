// lib/session-manager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

/**
 * Enhanced session management utilities for Supabase
 */
export const SessionManager = {
  /**
   * Store user session data explicitly in AsyncStorage
   */
  storeSession: async (session: any) => {
    try {
      if (!session) return false;
      
      // Store the session object
      await AsyncStorage.setItem('user-session', JSON.stringify(session));
      
      // Store a simplified user object for quick access
      if (session.user) {
        await AsyncStorage.setItem('user-info', JSON.stringify({
          id: session.user.id,
          email: session.user.email,
          created_at: session.user.created_at,
        }));
      }
      
      console.log('Session stored successfully');
      return true;
    } catch (error) {
      console.error('Error storing session:', error);
      return false;
    }
  },

  /**
   * Get stored session data
   */
  getSession: async () => {
    try {
      const sessionStr = await AsyncStorage.getItem('user-session');
      return sessionStr ? JSON.parse(sessionStr) : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  },

  /**
   * Get just the user info
   */
  getUserInfo: async () => {
    try {
      const userInfoStr = await AsyncStorage.getItem('user-info');
      return userInfoStr ? JSON.parse(userInfoStr) : null;
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  },

  /**
   * Clear all session data
   */
  clearSession: async () => {
    try {
      // Sign out from Supabase first
      await supabase.auth.signOut();
      
      // Clear stored session data
      await AsyncStorage.multiRemove([
        'user-session', 
        'user-info',
        'supabase.auth.token'
      ]);
      
      console.log('Session cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing session:', error);
      return false;
    }
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn: async () => {
    try {
      // First check AsyncStorage
      const sessionStr = await AsyncStorage.getItem('user-session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        // Check if token is expired
        const expiresAt = new Date(session.expires_at * 1000);
        if (expiresAt > new Date()) {
          return true;
        }
      }
      
      // If no valid session in AsyncStorage, check with Supabase
      const { data } = await supabase.auth.getSession();
      return !!data.session;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  }
};