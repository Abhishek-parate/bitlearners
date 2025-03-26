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

/**
 * Gets the current user's profile
 */
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

/**
 * Updates the current user's profile
 */
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

/**
 * Creates a new budget
 */
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

/**
 * Gets all budgets for the current user
 */
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
    return data || [];
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return [];
  }
};

/**
 * Gets a specific budget with its allocations and categories
 */
export const getBudgetDetails = async (budgetId) => {
  try {
    console.log(`Fetching details for budget: ${budgetId}`);
    
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
      
    if (error) {
      console.error('Budget details error:', error);
      throw error;
    }
    
    if (!data) {
      console.error('No budget details found for ID:', budgetId);
      return { id: budgetId, budget_allocations: [] };
    }
    
    console.log(`Found budget with ${data.budget_allocations?.length || 0} allocations`);
    
    // Ensure allocations are properly structured
    if (data.budget_allocations && Array.isArray(data.budget_allocations)) {
      data.budget_allocations.forEach(alloc => {
        console.log(`Allocation: Category=${alloc.category_id}, Amount=${alloc.amount}`);
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching budget details:', error);
    return { id: budgetId, budget_allocations: [] };
  }
};

/**
 * Gets all categories
 */
export const getCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

/**
 * Creates a budget allocation for a category
 */
export const createBudgetAllocation = async (budgetId: string, categoryId: string, amount: number) => {
  try {
    const { data, error } = await supabase
      .from('budget_allocations')
      .insert({
        budget_id: budgetId,
        category_id: categoryId,
        amount: amount
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating budget allocation:', error);
    throw error;
  }
};

/**
 * Adds a new expense
 */
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

/**
 * Gets expenses with optional filters
 * @param filters Object with filters like { category_id, start_date, end_date, limit }
 */
export const getExpenses = async (filters: any = {}) => {
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
    
    // Apply specific filters
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    
    if (filters.budget_id) {
      query = query.eq('budget_id', filters.budget_id);
    }
    
    if (filters.start_date) {
      query = query.gte('date', filters.start_date);
    }
    
    if (filters.end_date) {
      query = query.lte('date', filters.end_date);
    }
    
    // Apply any other filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && !['category_id', 'budget_id', 'start_date', 'end_date', 'limit'].includes(key)) {
        query = query.eq(key, value);
      }
    });
    
    // Apply limit if provided
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
      
    const { data, error } = await query;
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
};

/**
 * Adds a new income record
 */
// Updated addIncome function to avoid note field issues
export const addIncome = async (incomeData) => {
  try {
    console.log('Adding income with data:', incomeData);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not found');
    
    // Create a safe version of the income data without problematic fields
    const safeIncomeData = {
      user_id: user.id,
      amount: incomeData.amount,
      description: incomeData.description,
      date: incomeData.date,
      is_recurring: incomeData.is_recurring || false,
      frequency: incomeData.frequency
      // Remove note field until it's added to the schema
      // note: incomeData.note
    };
    
    const { data, error } = await supabase
      .from('income')
      .insert(safeIncomeData)
      .select()
      .single();
      
    if (error) {
      console.error('Supabase error adding income:', error);
      throw error;
    }
    
    console.log('Income added successfully:', data);
    return data;
  } catch (error) {
    console.error('Error adding income:', error);
    throw error;
  }
};

/**
 * Gets income records with optional filters
 */
export const getIncome = async (filters: any = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not found');
    
    let query = supabase
      .from('income')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    
    // Apply specific filters
    if (filters.start_date) {
      query = query.gte('date', filters.start_date);
    }
    
    if (filters.end_date) {
      query = query.lte('date', filters.end_date);
    }
    
    // Apply limit if provided
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
      
    const { data, error } = await query;
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching income:', error);
    return [];
  }
};

/**
 * Gets all savings goals
 */
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
    return data || [];
  } catch (error) {
    console.error('Error fetching savings goals:', error);
    return [];
  }
};

/**
 * Creates a new savings goal
 */
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

/**
 * Updates an existing savings goal
 */
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

/**
 * Gets budget insights
 */
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
    return data || [];
  } catch (error) {
    console.error('Error fetching budget insights:', error);
    return [];
  }
};

/**
 * Creates a budget insight
 */
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

/**
 * Helper for creating a category
 */
export const createCategory = async (categoryData: any) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert(categoryData)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

/**
 * Helper for debugging - clears session
 */
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


/**
 * Creates an expense
 */
export const createExpense = async (expenseData) => {
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
    console.error('Error creating expense:', error);
    throw error;
  }
};

/**
 * Update budget allocations in batch
 */
export const updateBudgetAllocations = async (allocationsData) => {
  try {
    // Prepare the RPC call with all allocations data
    const { data, error } = await supabase.rpc('update_budget_allocations', {
      allocations: allocationsData
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating budget allocations:', error);
    throw error;
  }
};

// If you don't have the RPC function set up, you can use this alternative approach
export const updateBudgetAllocationsAlt = async (allocationsData) => {
  try {
    // Delete existing allocations for this budget
    if (allocationsData.length > 0) {
      const budgetId = allocationsData[0].budget_id;
      
      const { error: deleteError } = await supabase
        .from('budget_allocations')
        .delete()
        .eq('budget_id', budgetId);
        
      if (deleteError) throw deleteError;
    }
    
    // Insert new allocations
    const { data, error } = await supabase
      .from('budget_allocations')
      .insert(allocationsData)
      .select();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating budget allocations:', error);
    throw error;
  }
};

/**
 * Gets transactions with optional filters and category info
 */
export const getTransactions = async (filters = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not found');
    
    let query = supabase
      .from('expenses')
      .select(`
        *,
        categories(id, name, color, icon)
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        if (key === 'start_date') {
          query = query.gte('date', value);
        } else if (key === 'end_date') {
          query = query.lte('date', value);
        } else if (key !== 'limit') {
          query = query.eq(key, value);
        }
      }
    });
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
};
