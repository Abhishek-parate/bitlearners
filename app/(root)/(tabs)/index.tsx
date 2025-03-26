// app/(root)/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../../contexts/AuthProvider';
import { supabase } from '../../../lib/supabase';

// Types for our data
type Budget = {
  id: string;
  name: string;
  amount: number;
  period: string;
  start_date: string;
  end_date?: string;
  description?: string;
};

type Expense = {
  id: string;
  amount: number;
  description?: string;
  date: string;
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
};

type CategorySummary = {
  id: string;
  name: string;
  icon: string;
  spent: number;
  limit: number;
  color: string;
};

type BudgetSummary = {
  totalBudget: number;
  spent: number;
  remaining: number;
};

// Icon mapping for categories
const categoryIconMap: Record<string, string> = {
  'Food': 'fast-food',
  'Transport': 'bus',
  'Housing': 'home',
  'Education': 'book',
  'Entertainment': 'film',
  'Shopping': 'cart',
  'Health': 'medkit',
  'Miscellaneous': 'apps'
};

const HomePage = () => {
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary>({
    totalBudget: 0,
    spent: 0,
    remaining: 0,
  });
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklySpending, setWeeklySpending] = useState([0, 0, 0, 0, 0, 0, 0]);

  // Get user from auth context
  const { user, loading: authLoading, signOut } = useAuth();
  
  // Get display name from user object
  const displayName = user?.user_metadata?.full_name || user?.email || "Student";

  const handleSetBudget = () => {
    router.push('/(root)/budget');
  };
  
  const handleSetExpense = () => {
    router.push('/(root)/expense');
  };
  

  const handleSignOut = async () => {
    try {
      await signOut();
      // Navigation is handled by auth state change listener
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get day name abbreviation
  const getDayName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Generate data for weekly spending chart
  const generateWeeklyLabels = (): string[] => {
    const today = new Date();
    const result = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      result.push(getDayName(date));
    }
    
    return result;
  };

  // Fetch all required data from database
  useEffect(() => {
    if (!authLoading && !user) {
      // Not authenticated, redirect to login
      console.log('No user in HomePage, redirecting to login');
      router.replace('/login');
      return;
    }
    
    if (user) {
      fetchData();
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log("Fetching data for user:", user?.id);
      
      // Fetch budgets
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (budgetsError) {
        console.error('Error fetching budgets:', budgetsError);
        throw budgetsError;
      }
      
      setBudgets(budgetsData || []);
      
      // Calculate total budget from active budgets
      const today = new Date().toISOString().split('T')[0];
      const activeBudgets = budgetsData?.filter(budget => 
        budget.start_date <= today && 
        (!budget.end_date || budget.end_date >= today)
      ) || [];
      
      const totalBudget = activeBudgets.reduce((sum, budget) => sum + Number(budget.amount), 0);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*');
      
      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        throw categoriesError;
      }
      
      // Fetch recent expenses with categories
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          categories:category_id (id, name, icon, color)
        `)
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(5);
      
      if (expensesError) {
        console.error('Error fetching expenses:', expensesError);
        throw expensesError;
      }
      
      setRecentExpenses(expensesData || []);
      
      // Calculate total spent
      const { data: spentData, error: spentError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user?.id)
        .gte('date', new Date(new Date().setDate(1)).toISOString().split('T')[0]) // First day of current month
        .lte('date', new Date().toISOString().split('T')[0]); // Today
      
      if (spentError) {
        console.error('Error calculating spent amount:', spentError);
        throw spentError;
      }
      
      const totalSpent = spentData?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
      
      // Update budget summary
      setBudgetSummary({
        totalBudget,
        spent: totalSpent,
        remaining: Math.max(0, totalBudget - totalSpent)
      });
      
      // Calculate spending per category
      const categorySummaries: CategorySummary[] = [];
      
      if (categoriesData) {
        for (const category of categoriesData) {
          // Get allocation for this category from budgets
          const totalAllocation = activeBudgets.reduce((sum, budget) => {
            // In a real app, you'd fetch allocations from budget_allocations table
            // For now, we'll just divide the budget evenly among categories
            return sum + (Number(budget.amount) / categoriesData.length);
          }, 0);
          
          // Get actual spending for this category
          const { data: categorySpentData, error: categorySpentError } = await supabase
            .from('expenses')
            .select('amount')
            .eq('user_id', user?.id)
            .eq('category_id', category.id)
            .gte('date', new Date(new Date().setDate(1)).toISOString().split('T')[0]) // First day of current month
            .lte('date', new Date().toISOString().split('T')[0]); // Today
          
          if (categorySpentError) {
            console.error('Error calculating category spending:', categorySpentError);
            continue;
          }
          
          const categorySpent = categorySpentData?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
          
          categorySummaries.push({
            id: category.id,
            name: category.name,
            icon: categoryIconMap[category.name] || 'apps',
            spent: categorySpent,
            limit: totalAllocation,
            color: category.color || '#0061FF'
          });
        }
      }
      
      setCategories(categorySummaries);
      
      // Calculate weekly spending
      const weeklyData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        const { data: daySpentData, error: daySpentError } = await supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', user?.id)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);
        
        if (daySpentError) {
          console.error('Error calculating daily spending:', daySpentError);
          weeklyData.push(0);
          continue;
        }
        
        const daySpent = daySpentData?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
        weeklyData.push(daySpent);
      }
      
      setWeeklySpending(weeklyData);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };
  
  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Sample chart data
  const spendingData = {
    labels: generateWeeklyLabels(),
    datasets: [
      {
        data: weeklySpending.length ? weeklySpending : [0, 0, 0, 0, 0, 0, 0],
        color: () => '#0061FF',
        strokeWidth: 2,
      },
    ],
  };

  // Handle loading state
  if (authLoading || loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0061FF" />
      </SafeAreaView>
    );
  }

  // Handle no user case
  if (!user) {
    return null; // Will be redirected in useEffect
  }

  // Calculate percentage spent
  const percentageSpent = budgetSummary.totalBudget > 0 
    ? (budgetSummary.spent / budgetSummary.totalBudget) * 100 
    : 0;

  return (
    <SafeAreaView className="flex-1 bg-accent-100">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 flex-row justify-between items-center">
          <View>
            <Text className="font-rubik-medium text-black-300 text-xl">Hello, {displayName}</Text>
            <Text className="font-rubik text-black-100">Let's manage your budget!</Text>
          </View>
          
          <TouchableOpacity 
            className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center"
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color="#0061FF" />
          </TouchableOpacity>
        </View>

        {/* Budget Summary Card */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <Text className="font-rubik-medium text-black-300 text-lg mb-2">Monthly Budget</Text>
          
          {/* Progress bar */}
          <View className="h-4 bg-primary-100 rounded-full w-full mb-2">
            <View 
              className="h-4 bg-primary-300 rounded-full" 
              style={{ width: `${Math.min(100, percentageSpent)}%` }} 
            />
          </View>
          
          <View className="flex-row justify-between">
            <View>
              <Text className="font-rubik text-black-100">Spent</Text>
              <Text className="font-rubik-bold text-black-300">{formatCurrency(budgetSummary.spent)}</Text>
            </View>
            <View>
              <Text className="font-rubik text-black-100">Remaining</Text>
              <Text className="font-rubik-bold text-primary-300">{formatCurrency(budgetSummary.remaining)}</Text>
            </View>
            <View>
              <Text className="font-rubik text-black-100">Total</Text>
              <Text className="font-rubik-bold text-black-300">{formatCurrency(budgetSummary.totalBudget)}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mx-4 flex-row justify-between mb-4">
          <TouchableOpacity onPress={handleSetExpense} className="bg-primary-300 px-4 py-3 rounded-xl flex-row items-center w-[48%]">
            <Ionicons name="add-circle" size={24} color="white" />
            <Text className="font-rubik-medium text-white ml-2">Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSetBudget} className="bg-white border border-primary-300 px-4 py-3 rounded-xl flex-row items-center w-[48%]">
            <Ionicons name="arrow-forward-circle" size={24} color="#0061FF" />
            <Text className="font-rubik-medium text-primary-300 ml-2">Set Budget</Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Spending Chart */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <Text className="font-rubik-medium text-black-300 text-lg mb-2">Weekly Spending</Text>
          <LineChart
            data={spendingData}
            width={Dimensions.get('window').width - 40}
            height={180}
            chartConfig={{
              backgroundColor: 'white',
              backgroundGradientFrom: 'white',
              backgroundGradientTo: 'white',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 97, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#0061FF',
              },
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />
        </View>

        {/* Category Spending */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <Text className="font-rubik-medium text-black-300 text-lg mb-2">Spending by Category</Text>
          
          {categories.length > 0 ? (
            categories.map((category) => (
              <View key={category.id} className="mb-3">
                <View className="flex-row justify-between items-center mb-1">
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center mr-2">
                      <Ionicons name={category.icon} size={16} color={category.color} />
                    </View>
                    <Text className="font-rubik text-black-300">{category.name}</Text>
                  </View>
                  <Text className="font-rubik-medium text-black-300">
                    {formatCurrency(category.spent)} / {formatCurrency(category.limit)}
                  </Text>
                </View>
                
                {/* Category progress bar */}
                <View className="h-2 bg-primary-100 rounded-full w-full">
                  <View 
                    className="h-2 rounded-full" 
                    style={{ 
                      width: `${category.limit > 0 ? Math.min(100, (category.spent / category.limit) * 100) : 0}%`,
                      backgroundColor: category.color 
                    }} 
                  />
                </View>
              </View>
            ))
          ) : (
            <View className="items-center py-6">
              <Text className="font-rubik text-black-100">No category data available</Text>
            </View>
          )}

          <TouchableOpacity className="mt-2" onPress={() => router.push('/budget/view')}>
            <Text className="font-rubik-medium text-primary-300 text-center">View All Categories</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-rubik-medium text-black-300 text-lg">Recent Expenses</Text>
            <TouchableOpacity onPress={() => router.push('/explore')}>
              <Text className="font-rubik-medium text-primary-300">See All</Text>
            </TouchableOpacity>
          </View>
          
          {recentExpenses.length > 0 ? (
            recentExpenses.map((expense) => (
              <View key={expense.id} className="flex-row justify-between items-center mb-3 pb-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
                    <Ionicons 
                      name={expense.category?.icon || 'apps-outline'} 
                      size={20} 
                      color={expense.category?.color || '#0061FF'} 
                    />
                  </View>
                  <View>
                    <Text className="font-rubik-medium text-black-300">{expense.description || 'Expense'}</Text>
                    <Text className="font-rubik text-black-100 text-xs">
                      {formatDate(expense.date)} • {expense.category?.name || 'Uncategorized'}
                    </Text>
                  </View>
                </View>
                <Text className="font-rubik-bold text-danger">-{formatCurrency(expense.amount)}</Text>
              </View>
            ))
          ) : (
            <View className="items-center py-6">
              <Ionicons name="receipt-outline" size={48} color="#CCCCCC" />
              <Text className="font-rubik-medium text-black-100 mt-2">No expenses recorded yet</Text>
              <Text className="font-rubik text-black-100 text-sm text-center mt-1">
                Tap "Add Expense" to record your first expense
              </Text>
            </View>
          )}
        </View>

        {/* Tips Section */}
        <View className="mx-4 p-4 bg-primary-100 rounded-2xl mb-6">
          <View className="flex-row justify-between items-center">
            <View className="w-3/4">
              <Text className="font-rubik-medium text-black-300 text-lg mb-1">Saving Tip</Text>
              <Text className="font-rubik text-black-200">Try the 50/30/20 rule: Spend 50% on needs, 30% on wants, and save 20%.</Text>
            </View>
            <View className="w-12 h-12 bg-primary-200 rounded-full items-center justify-center">
              <Ionicons name="bulb-outline" size={24} color="#0061FF" />
            </View>
          </View>
        </View>
        
        {/* Refresh button */}
        <TouchableOpacity 
          className="mx-auto mb-8 bg-primary-300 px-6 py-2 rounded-full flex-row items-center"
          onPress={fetchData}
        >
          <Ionicons name="refresh" size={16} color="white" />
          <Text className="font-rubik-medium text-white ml-2">Refresh Data</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomePage;