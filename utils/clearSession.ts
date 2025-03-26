// utils/clearSession.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

/**
 * This function completely clears the local auth state and storage
 * Use this for troubleshooting auth issues
 */
export async function clearAuthState() {
  try {
    console.log('Clearing auth state...');
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear Supabase related items from AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const supabaseKeys = keys.filter(key => 
      key.includes('supabase') || 
      key.includes('auth')
    );
    
    if (supabaseKeys.length > 0) {
      await AsyncStorage.multiRemove(supabaseKeys);
      console.log('Removed Supabase storage keys:', supabaseKeys);
    } else {
      console.log('No Supabase storage keys found');
    }
    
    console.log('Auth state cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing auth state:', error);
    return false;
  }
}