// lib/session-manager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';

export const SessionManager = {
  async storeSession(session: Session): Promise<void> {
    try {
      const jsonValue = JSON.stringify(session);
      await AsyncStorage.setItem('supabase.session', jsonValue);
      console.log('Session stored successfully');
    } catch (error) {
      console.error('Error storing session:', error);
    }
  },

  async getSession(): Promise<Session | null> {
    try {
      const jsonValue = await AsyncStorage.getItem('supabase.session');
      if (jsonValue) {
        console.log('Found stored session');
        return JSON.parse(jsonValue);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving session:', error);
      return null;
    }
  },

  async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem('supabase.session');
      console.log('Session cleared successfully');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }
};