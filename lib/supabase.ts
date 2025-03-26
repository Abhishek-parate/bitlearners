// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key not found in environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper functions for working with Supabase
export const getProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not found');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

export const updateProfile = async (updates: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not found');
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

export const createBudget = async (budgetData: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not found');
    
    const { data, error } = await supabase
      .from('budgets')
      .insert({ ...budgetData, user_id: user.id })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating budget:', error);
    throw error;
  }
};

export const getBudgets = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not found');
    
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching budgets:', error);
    throw error;
  }
};

export const getBudgetDetails = async (budgetId: string) => {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        budget_allocations(
          *,
          categories(*)
        )
      `)
      .eq('id', budgetId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching budget details:', error);
    throw error;
  }
};

export const getCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

export const addExpense = async (expenseData: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not found');
    
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...expenseData, user_id: user.id })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
};

export const getExpenses = async (filters = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not found');
    
    let query = supabase
      .from('expenses')
      .select(`
        *,
        categories(*)
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    
    // Apply any additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        query = query.eq(key, value);
      }
    });
      
    const { data, error } = await query;
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }
};

export const addIncome = async (incomeData: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not found');
    
    const { data, error } = await supabase
      .from('income')
      .insert({ ...incomeData, user_id: user.id })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding income:', error);
    throw error;
  }
};

export const getIncome = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not found');
    
    const { data, error } = await supabase
      .from('income')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching income:', error);
    throw error;
  }
};

export const getSavingsGoals = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not found');
    
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching savings goals:', error);
    throw error;
  }
};

export const createSavingsGoal = async (goalData: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not found');
    
    const { data, error } = await supabase
      .from('savings_goals')
      .insert({ ...goalData, user_id: user.id })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating savings goal:', error);
    throw error;
  }
};

export const updateSavingsGoal = async (goalId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('savings_goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating savings goal:', error);
    throw error;
  }
};

export const getBudgetInsights = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not found');
    
    const { data, error } = await supabase
      .from('budget_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching budget insights:', error);
    throw error;
  }
};

export const createBudgetInsight = async (insightData: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not found');
    
    const { data, error } = await supabase
      .from('budget_insights')
      .insert({ ...insightData, user_id: user.id })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating budget insight:', error);
    throw error;
  }
};

// Helper for debugging
export const clearSession = async () => {
    try {
      console.log('Signing out and clearing session...');
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('supabase.auth.token');
      console.log('Session cleared');
      return true;
    } catch (error) {
      console.error('Error clearing session:', error);
      return false;
    }
  };