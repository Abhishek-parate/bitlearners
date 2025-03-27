import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator, 
  RefreshControl,
  Dimensions
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthProvider';

// Import Supabase functions
import { 
  getBudgets, 
  getBudgetDetails, 
  getExpenses, 
  getCategories,
  getBudgetInsights,
  getSavingsGoals,
  getIncome
} from '@/lib/supabase';

// Import AI services
import {
  generateOptimizedBudget,
  generateSpendingInsights,
  getDailySpendingTip
} from '@/lib/ai-service';

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budgetSummary, setBudgetSummary] = useState({
    totalBudget: 0,
    spent: 0,
    remaining: 0,
    percentageSpent: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [savingsGoal, setSavingsGoal] = useState(null);
  const [aiInsight, setAiInsight] = useState(null);
  const [spendingData, setSpendingData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0], color: () => '#0061FF', strokeWidth: 2 }]
  });
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [savingTip, setSavingTip] = useState({
    title: "Saving Tip",
    content: "Try the 50/30/20 rule: Spend 50% on needs, 30% on wants, and save 20%."
  });
  const [aiActions, setAiActions] = useState([
    {
      id: 'insights',
      name: 'Transaction Insights',
      icon: 'analytics',
      action: () => router.push('/expense/index')
    },
    {
      id: 'optimize',
      name: 'Optimize Budget',
      icon: 'sparkles',
      action: () => router.push('/budget/optimize')
    }
  ]);
  const [incomeSummary, setIncomeSummary] = useState({
    totalIncome: 0,
    netSavings: 0
  });
  
  const { user } = useAuth();
  
  // Get display name from user object
// Get display name from user object or get first part of email
const getDisplayName = () => {
  // First check if there's a full_name in user metadata
  if (user?.user_metadata?.full_name) {
    return user.user_metadata.full_name;
  } 
  // If no full name, extract the username portion from email
  else if (user?.email) {
    // Extract everything before the @ symbol
    const emailParts = user.email.split('@');
    if (emailParts.length > 0) {
      // Capitalize the first letter
      const username = emailParts[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
  }
  
  // Default fallback
  return "Student";
};

const displayName = getDisplayName();  const screenWidth = Dimensions.get('window').width;

  const handleSetBudget = () => {
    router.push('/budget/add');
  };

  const handleSetExpense = () => {
    router.push('/expense/add');
  };

  const getCategoryIcon = (categoryName = '') => {
    const categoryIcons = {
      'Food': 'fast-food',
      'Transport': 'bus',
      'Housing': 'home',
      'Education': 'book',
      'Entertainment': 'film',
      'Shopping': 'cart',
      'Health': 'fitness',
      'Miscellaneous': 'albums',
    };
    
    return categoryIcons[categoryName] || 'albums';
  };

  const getCategoryColor = (index) => {
    const colors = ['#0061FF', '#F75555', '#4CAF50', '#FF9800', '#9C27B0', '#795548', '#009688', '#607D8B'];
    return colors[index % colors.length];
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch all data in parallel for efficiency
      const [
        budgetsResult, 
        allCategories, 
        allExpenses, 
        insightsResult, 
        savingsGoalsResult,
        incomeResult
      ] = await Promise.all([
        getBudgets(),
        getCategories(),
        getExpenses(),
        getBudgetInsights(),
        getSavingsGoals(),
        getIncome()
      ]);
      
      console.log('Data fetched:', {
        budgetsCount: budgetsResult?.length || 0,
        categoriesCount: allCategories?.length || 0,
        expensesCount: allExpenses?.length || 0,
        insightsCount: insightsResult?.length || 0,
        savingsGoalsCount: savingsGoalsResult?.length || 0,
        incomeCount: incomeResult?.length || 0
      });
      
      // Ensure we have valid arrays to work with
      const budgets = Array.isArray(budgetsResult) ? budgetsResult : [];
      const expenses = Array.isArray(allExpenses) ? allExpenses : [];
      const categories = Array.isArray(allCategories) ? allCategories : [];
      const insights = Array.isArray(insightsResult) ? insightsResult : [];
      const savingsGoals = Array.isArray(savingsGoalsResult) ? savingsGoalsResult : [];
      const incomes = Array.isArray(incomeResult) ? incomeResult : [];
      
      // Set latest savings goal if any exist
      if (savingsGoals.length > 0) {
        setSavingsGoal(savingsGoals[0]);
      }
      
      // Calculate income summary
      const totalIncome = incomes.reduce((sum, income) => sum + Number(income.amount || 0), 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      
      setIncomeSummary({
        totalIncome,
        netSavings: totalIncome - totalExpenses
      });
      
      // Process budget data
      if (budgets.length === 0) {
        // If no budgets found, just set empty state and continue with the rest of the data
        setBudgetSummary({
          totalBudget: 0,
          spent: 0,
          remaining: 0,
          percentageSpent: 0
        });
      } else {
        // Get total budget amount
        const totalBudgetAmount = budgets.reduce((sum, budget) => {
          const amount = Number(budget.amount) || 0;
          return sum + amount;
        }, 0);
        
        // Get budget details for each budget
        const budgetDetailsPromises = budgets.map(budget => 
          getBudgetDetails(budget.id).catch(err => {
            console.error(`Failed to get details for budget ${budget.id}:`, err);
            return { id: budget.id, budget_allocations: [] }; // Return fallback on error
          })
        );
        
        const budgetDetailsResults = await Promise.all(budgetDetailsPromises);
        
        // Calculate total spent from all expenses
        const totalSpent = expenses.reduce((sum, expense) => {
          const amount = Number(expense.amount) || 0;
          return sum + amount;
        }, 0);
        
        // Update budget summary
        const percentageSpent = totalBudgetAmount > 0 
          ? Math.min((totalSpent / totalBudgetAmount) * 100, 100) 
          : 0;
        
        setBudgetSummary({
          totalBudget: totalBudgetAmount,
          spent: totalSpent,
          remaining: totalBudgetAmount - totalSpent,
          percentageSpent
        });
        
        // Process categories with spending info
  // Process categories with spending info
const categoriesWithSpending = categories.map((category, index) => {
  console.log(`Processing category: ${category.name}, ID: ${category.id}`);
  
  // Sum allocations across all budgets for this category
  let totalAllocation = 0;
  
  budgetDetailsResults.forEach(budgetDetail => {
    console.log(`Checking budget: ${budgetDetail.id}`);
    const allocations = Array.isArray(budgetDetail.budget_allocations) 
      ? budgetDetail.budget_allocations 
      : [];
      
    console.log(`Found ${allocations.length} allocations`);
    
    const categoryAllocation = allocations.find(
      alloc => alloc.category_id === category.id
    );
    
    if (categoryAllocation && !isNaN(Number(categoryAllocation.amount))) {
      console.log(`Found allocation: ${categoryAllocation.amount} for ${category.name}`);
      totalAllocation += Number(categoryAllocation.amount);
    }
  });
  
  // Calculate category spending
  const categoryExpenses = expenses.filter(expense => {
    const matches = expense.category_id === category.id;
    if (matches) {
      console.log(`Found expense: ${expense.amount} for ${category.name}`);
    }
    return matches;
  });
  
  const categorySpent = categoryExpenses.reduce((sum, expense) => {
    const amount = Number(expense.amount) || 0;
    return sum + amount;
  }, 0);
  
  console.log(`Category ${category.name}: spent=${categorySpent}, limit=${totalAllocation}`);
  
  return {
    id: category.id,
    name: category.name || 'Unnamed Category',
    icon: getCategoryIcon(category.name),
    spent: categorySpent,
    limit: totalAllocation || 1, // Avoid divide by zero
    color: getCategoryColor(index),
    percentage: totalSpent > 0 ? (categorySpent / totalSpent) * 100 : 0
  };
});

// Include all categories with proper data
const validCategories = categoriesWithSpending.filter(cat => 
  cat.name && cat.id
);

console.log(`Found ${validCategories.length} valid categories`);
setCategories(validCategories);
        // Prepare pie chart data for category distribution
        const pieChartData = validCategories
          .filter(cat => cat.spent > 0)
          .map(cat => ({
            name: cat.name,
            value: cat.spent,
            color: cat.color,
            legendFontColor: '#7F7F7F',
            legendFontSize: 12
          }));
        
        setCategoryDistribution(pieChartData);
      }
      
      // Process recent transactions
      if (expenses.length > 0) {
        // Sort expenses by date (most recent first)
        const sortedExpenses = [...expenses].sort((a, b) => {
          const dateA = new Date(a.date || a.created_at || 0);
          const dateB = new Date(b.date || b.created_at || 0);
          return dateB - dateA;
        });
        
        const recentExpenses = sortedExpenses.slice(0, 5);
        
        const processedTransactions = recentExpenses.map(expense => {
          // Try to get category name from nested object, then from categories array
          let categoryName = 'Other';
          
          if (expense.categories && expense.categories.name) {
            categoryName = expense.categories.name;
          } else if (expense.category_id) {
            const matchingCategory = categories.find(c => c.id === expense.category_id);
            if (matchingCategory) {
              categoryName = matchingCategory.name;
            }
          }
          
          return {
            id: expense.id || `expense-${Math.random()}`,
            description: expense.description || 'Unlabeled Expense',
            amount: Number(expense.amount) || 0,
            created_at: expense.date || expense.created_at || new Date().toISOString(),
            category_id: expense.category_id,
            category_name: categoryName
          };
        });
        
        setRecentTransactions(processedTransactions);
      }
      
      // Prepare weekly spending data
      if (expenses.length > 0) {
        const today = new Date();
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 6);
        
        const weeklyData = [];
        const weekLabels = [];
        
        for (let i = 0; i <= 6; i++) {
          const date = new Date(oneWeekAgo);
          date.setDate(oneWeekAgo.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          // Sum expenses for this day
          const dayExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date || expense.created_at || 0);
            return expenseDate.toISOString().split('T')[0] === dateStr;
          });
          
          const dayTotal = dayExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
          
          weeklyData.push(dayTotal);
          weekLabels.push(date.toLocaleString('en-US', { weekday: 'short' }).substring(0, 3));
        }
        
        setSpendingData({
          labels: weekLabels,
          datasets: [
            {
              data: weeklyData,
              color: () => '#0061FF',
              strokeWidth: 2,
            },
          ],
        });
      }
      
      // Set AI insight or saving tip from insights if available
      if (insights.length > 0) {
        const recentInsight = insights[0]; // Get most recent insight
        
        setAiInsight({
          type: recentInsight.insight_type,
          description: recentInsight.description
        });
        
        const randomInsight = insights[Math.floor(Math.random() * insights.length)];
        setSavingTip({
          title: randomInsight.insight_type === 'recommendation' ? 'Recommendation' : 'Budget Insight',
          content: randomInsight.description || "Track your daily expenses to stay on budget."
        });
      } else {
        // Try to generate a daily spending tip
        try {
          const result = await getDailySpendingTip(expenses, budgets);
          
          if (result.success && result.data) {
            setSavingTip({
              title: result.data.title || "Daily Tip",
              content: result.data.tip || "Track your spending daily for better budget control."
            });
          }
        } catch (error) {
          console.error('Error generating daily tip:', error);
          // Keep default tip
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set some default data to avoid completely blank UI
      setCategories([
        { 
          id: '1', 
          name: 'Food', 
          icon: 'fast-food', 
          spent: 0, 
          limit: 100, 
          color: '#0061FF' 
        }
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-accent-100 justify-center items-center">
        <ActivityIndicator size="large" color="#0061FF" />
        <Text className="font-rubik mt-4">Loading your budget data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-accent-100">
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0061FF"]} />
        }
      >
        {/* Header */}
        <View className="px-4 py-4 flex-row justify-between items-center">
          <View>
            <Text className="font-rubik-medium text-black-300 text-xl">Hello, {displayName}</Text>
            <Text className="font-rubik text-black-100">Let's manage your budget!</Text>
          </View>
          <TouchableOpacity 
            className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center"
            onPress={() => router.push('/(root)/profile')}
          >
            <Ionicons name="person-outline" size={20} color="#0061FF" />
          </TouchableOpacity>
        </View>

        {/* Budget Summary Card */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <Text className="font-rubik-medium text-black-300 text-lg mb-2">Monthly Budget</Text>
          
          {/* Progress bar */}
          <View className="h-4 bg-primary-100 rounded-full w-full mb-2">
            <View 
              className="h-4 bg-primary-300 rounded-full" 
              style={{ width: `${budgetSummary.percentageSpent}%` }} 
            />
          </View>
          
          <View className="flex-row justify-between">
            <View>
              <Text className="font-rubik text-black-100">Spent</Text>
              <Text className="font-rubik-bold text-black-300">${budgetSummary.spent.toFixed(2)}</Text>
            </View>
            <View>
              <Text className="font-rubik text-black-100">Remaining</Text>
              <Text className="font-rubik-bold text-primary-300">${budgetSummary.remaining.toFixed(2)}</Text>
            </View>
            <View>
              <Text className="font-rubik text-black-100">Total</Text>
              <Text className="font-rubik-bold text-black-300">${budgetSummary.totalBudget.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Income & Savings Summary */}
        <View className="mx-4 flex-row justify-between mb-4">
          <View className="bg-white p-3 rounded-2xl shadow-sm w-[48%]">
            <Text className="font-rubik text-black-100 mb-1">Monthly Income</Text>
            <Text className="font-rubik-bold text-green-700 text-xl">${incomeSummary.totalIncome.toFixed(2)}</Text>
          </View>
          <View className="bg-white p-3 rounded-2xl shadow-sm w-[48%]">
            <Text className="font-rubik text-black-100 mb-1">Net Savings</Text>
            <Text 
              className={`font-rubik-bold text-xl ${incomeSummary.netSavings >= 0 ? 'text-green-700' : 'text-danger'}`}
            >
              ${incomeSummary.netSavings.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mx-4 flex-row justify-between mb-4">
          <TouchableOpacity onPress={handleSetExpense} className="bg-primary-300 px-4 py-3 rounded-xl flex-row items-center w-[48%]">
            <Ionicons name="add-circle" size={24} color="white" />
            <Text className="font-rubik-medium text-white ml-2">Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSetBudget} className="bg-white border border-primary-300 px-4 py-3 rounded-xl flex-row items-center w-[48%]">
            <Ionicons name="wallet" size={24} color="#0061FF" />
            <Text className="font-rubik-medium text-primary-300 ml-2">Set Budget</Text>
          </TouchableOpacity>
        </View>

        {/* AI Insight (if available) */}
        {aiInsight && (
          <View className="mx-4 p-4 bg-primary-100 rounded-2xl mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="font-rubik-medium text-black-300 text-lg">AI Insight</Text>
              <View className="w-8 h-8 bg-primary-200 rounded-full items-center justify-center">
                <Ionicons name="flash" size={16} color="#0061FF" />
              </View>
            </View>
            <Text className="font-rubik text-black-200">{aiInsight.description}</Text>
            <TouchableOpacity 
              onPress={() => router.push('/budget/insights')}
              className="mt-3 self-end"
            >
              <Text className="font-rubik-medium text-primary-300">More Insights</Text>
            </TouchableOpacity>
          </View>
        )}

     

        {/* Weekly Spending Chart */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <Text className="font-rubik-medium text-black-300 text-lg mb-2">Weekly Spending</Text>
          <LineChart
            data={spendingData}
            width={screenWidth - 40}
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

        {/* Category Distribution Pie Chart */}
        {categoryDistribution.length > 0 && (
          <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
            <Text className="font-rubik-medium text-black-300 text-lg mb-2">Spending Distribution</Text>
            <PieChart
              data={categoryDistribution}
              width={screenWidth - 40}
              height={180}
              chartConfig={{
                backgroundColor: 'white',
                backgroundGradientFrom: 'white',
                backgroundGradientTo: 'white',
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {/* Savings Goal (if any) */}
        {savingsGoal && (
          <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="font-rubik-medium text-black-300 text-lg">{savingsGoal.name}</Text>
              <TouchableOpacity onPress={() => router.push('/goals/create')}>
                <Text className="font-rubik-medium text-primary-300 text-sm">View All</Text>
              </TouchableOpacity>
            </View>
            <View className="h-4 bg-primary-100 rounded-full w-full mb-2">
              <View 
                className="h-4 bg-green-500 rounded-full" 
                style={{ 
                  width: `${Math.min((savingsGoal.current_amount / savingsGoal.target_amount) * 100, 100)}%` 
                }} 
              />
            </View>
            <View className="flex-row justify-between">
              <View>
                <Text className="font-rubik text-black-100">Saved</Text>
                <Text className="font-rubik-bold text-black-300">${savingsGoal.current_amount.toFixed(2)}</Text>
              </View>
              <View>
                <Text className="font-rubik text-black-100">Target</Text>
                <Text className="font-rubik-bold text-primary-300">${savingsGoal.target_amount.toFixed(2)}</Text>
              </View>
              <View>
                <Text className="font-rubik text-black-100">Progress</Text>
                <Text className="font-rubik-bold text-green-700">
                  {Math.round((savingsGoal.current_amount / savingsGoal.target_amount) * 100)}%
                </Text>
              </View>
            </View>
          </View>
        )}

       {/* Category Spending */}
       {/* Category Spending */}
<View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
  
  
  {categories && categories.length > 0 ? (
    categories.map((category) => (
      <View key={category.id} className="mb-3">
        <View className="flex-row justify-between items-center mb-1">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center mr-2">
              <Ionicons name={category.icon || 'albums'} size={16} color={category.color || '#0061FF'} />
            </View>
            <Text className="font-rubik text-black-300">{category.name}</Text>
          </View>
          <Text className="font-rubik-medium text-black-300">
            ${(category.spent || 0).toFixed(2)} / ${(category.limit || 0).toFixed(2)}
          </Text>
        </View>
        
        {/* Category progress bar */}
        <View className="h-2 bg-primary-100 rounded-full w-full">
          <View 
            className="h-2 rounded-full" 
            style={{ 
              width: `${Math.min(((category.spent || 0) / (category.limit || 1)) * 100, 100)}%`,
              backgroundColor: category.color || '#0061FF'
            }} 
          />
        </View>
      </View>
    ))
  ) : (
    <View className="items-center py-4">
      <Ionicons name="pie-chart-outline" size={32} color="#E0E0E0" />
      <Text className="font-rubik text-black-100 mt-2">No category data available</Text>
      <Text className="font-rubik text-black-100 text-xs mt-1">Debugging info: {JSON.stringify({categoryCount: categories?.length})}</Text>
      <TouchableOpacity 
        onPress={handleSetBudget}
        className="mt-2 bg-primary-200 px-3 py-1 rounded-lg"
      >
        <Text className="font-rubik-medium text-primary-300">Set Up Budget</Text>
      </TouchableOpacity>
    </View>
  )}
</View>

        {/* Recent Transactions */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-rubik-medium text-black-300 text-lg">Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/expense/')}>
              <Text className="font-rubik-medium text-primary-300">See All</Text>
            </TouchableOpacity>
          </View>
          
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <View key={transaction.id} className="flex-row justify-between items-center mb-3 pb-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
                    <Ionicons 
                      name={getCategoryIcon(transaction.category_name)} 
                      size={20} 
                      color="#0061FF" 
                    />
                  </View>
                  <View>
                    <Text className="font-rubik-medium text-black-300">{transaction.description}</Text>
                    <Text className="font-rubik text-black-100 text-xs">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Text className="font-rubik-bold text-danger">-${transaction.amount.toFixed(2)}</Text>
              </View>
            ))
          ) : (
            <View className="items-center py-4">
              <Ionicons name="receipt-outline" size={32} color="#E0E0E0" />
              <Text className="font-rubik text-black-100 mt-2">No transactions yet</Text>
              <TouchableOpacity 
                onPress={handleSetExpense}
                className="mt-2 bg-primary-200 px-3 py-1 rounded-lg"
              >
                <Text className="font-rubik-medium text-primary-300">Add Expense</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tips Section */}
        <View className="mx-4 p-4 bg-primary-100 rounded-2xl mb-6">
          <View className="flex-row justify-between items-center">
            <View className="w-3/4">
              <Text className="font-rubik-medium text-black-300 text-lg mb-1">{savingTip.title}</Text>
              <Text className="font-rubik text-black-200">{savingTip.content}</Text>
            </View>
            <View className="w-12 h-12 bg-primary-200 rounded-full items-center justify-center">
              <Ionicons name="bulb-outline" size={24} color="#0061FF" />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}