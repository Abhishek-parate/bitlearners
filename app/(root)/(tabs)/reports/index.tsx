// app/(root)/(tabs)/transaction-report.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

// Import Supabase functions
import { 
  getExpenses, 
  getCategories,
  getIncome
} from '@/lib/supabase';

// Create dummy AI service functions if they don't exist yet
const analyzeSpendingTrends = async (expenses, period) => {
  // Implement a basic version here that doesn't require AI
  try {
    console.log(`Analyzing spending trends for ${expenses.length} expenses over ${period} period`);
    
    // Group expenses by category
    const categoryTotals = {};
    let totalSpending = 0;
    
    expenses.forEach(expense => {
      const catId = expense.category_id || 'uncategorized';
      categoryTotals[catId] = categoryTotals[catId] || 0;
      categoryTotals[catId] += Number(expense.amount);
      totalSpending += Number(expense.amount);
    });
    
    // Find top category
    let topCategoryId = null;
    let topAmount = 0;
    
    Object.entries(categoryTotals).forEach(([catId, amount]) => {
      if (amount > topAmount) {
        topAmount = amount;
        topCategoryId = catId;
      }
    });
    
    // Generate insights
    const insights = [];
    
    // Top category insight
    if (topCategoryId) {
      const percentage = totalSpending > 0 ? Math.round((topAmount / totalSpending) * 100) : 0;
      let categoryName = "Uncategorized";
      
      // Find category name if it's not uncategorized
      if (topCategoryId !== 'uncategorized') {
        const foundCategory = expenses.find(e => e.category_id === topCategoryId)?.categories;
        if (foundCategory) {
          categoryName = foundCategory.name;
        }
      }
      
      insights.push({
        title: 'Top Spending Category',
        description: `${categoryName} is your highest spending category at ${percentage}% of total expenses.`,
        type: 'category'
      });
    }
    
    // Spending trend insight
    insights.push({
      title: 'Spending Trend',
      description: `You've spent a total of ₹${totalSpending.toFixed(2)} in this ${period}.`,
      type: 'trend'
    });
    
    // If there's enough data, add more insights
    if (expenses.length > 5) {
      // Find the highest single expense
      const highestExpense = expenses.reduce((highest, current) => 
        Number(current.amount) > Number(highest.amount) ? current : highest, 
        { amount: 0 }
      );
      
      if (highestExpense.amount > 0) {
        insights.push({
          title: 'Largest Expense',
          description: `Your largest single expense was ₹${Number(highestExpense.amount).toFixed(2)} for "${highestExpense.description || 'Unlabeled'}"`,
          type: 'anomaly'
        });
      }
    }
    
    return {
      success: true,
      data: {
        insights
      }
    };
  } catch (error) {
    console.error('Error in analyzeSpendingTrends:', error);
    return {
      success: false,
      error: 'Failed to analyze spending trends'
    };
  }
};

const generateFinancialHealthScore = async (expenses, income) => {
  // Dummy implementation
  return {
    success: true,
    data: {
      score: 75,
      message: 'Good financial health',
      improvements: [
        'Create a dedicated emergency fund',
        'Track daily expenses to identify spending leaks',
        'Reduce non-essential purchases'
      ]
    }
  };
};

export default function TransactionReportPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month'); // week, month, year
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categorySpending, setCategorySpending] = useState([]);
  const [financialHealth, setFinancialHealth] = useState({
    score: 0,
    color: '#F75555',
    message: '',
    improvements: []
  });
  const [spendingInsights, setSpendingInsights] = useState([]);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  
  const screenWidth = Dimensions.get('window').width;
  
  useEffect(() => {
    fetchData();
  }, [period]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Determine date range based on period
      const endDate = new Date();
      const startDate = new Date();
      
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Fetch expenses, income, and categories
      const [expensesData, incomeData, categoriesData] = await Promise.all([
        getExpenses({ start_date: startDateStr, end_date: endDateStr }),
        getIncome({ start_date: startDateStr, end_date: endDateStr }),
        getCategories()
      ]);
      
      setExpenses(expensesData || []);
      setIncome(incomeData || []);
      setCategories(categoriesData || []);
      
      // Process category spending
      if (expensesData && categoriesData) {
        const categoryMap = {};
        
        // Initialize categories
        categoriesData.forEach(cat => {
          categoryMap[cat.id] = {
            id: cat.id,
            name: cat.name,
            color: cat.color || getRandomColor(cat.name),
            icon: cat.icon || 'grid-outline',
            amount: 0
          };
        });
        
        // Sum expenses by category
        expensesData.forEach(expense => {
          if (expense.category_id && categoryMap[expense.category_id]) {
            categoryMap[expense.category_id].amount += Number(expense.amount);
          } else {
            // Handle uncategorized expenses
            if (!categoryMap.uncategorized) {
              categoryMap.uncategorized = {
                id: 'uncategorized',
                name: 'Uncategorized',
                color: '#AAAAAA',
                icon: 'help-circle-outline',
                amount: 0
              };
            }
            categoryMap.uncategorized.amount += Number(expense.amount);
          }
        });
        
        // Convert to array and sort by amount
        const categoryArray = Object.values(categoryMap)
          .filter(cat => cat.amount > 0)
          .sort((a, b) => b.amount - a.amount);
        
        setCategorySpending(categoryArray);
        
        // Calculate total expenses and income
        const totalExpenses = expensesData.reduce((sum, expense) => sum + Number(expense.amount), 0);
        const totalIncome = incomeData.reduce((sum, income) => sum + Number(income.amount), 0);
        
        // Basic health score calculation
        let healthScore;
        let healthColor;
        let healthMessage;
        
        if (totalIncome === 0) {
          healthScore = 30; // No income recorded is concerning
          healthColor = '#F75555';
          healthMessage = 'Missing income data';
        } else {
          const expenseRatio = totalExpenses / totalIncome;
          
          if (expenseRatio > 1) {
            // Spending more than earning
            healthScore = Math.max(0, 50 - ((expenseRatio - 1) * 50));
            healthColor = '#F75555';
            healthMessage = 'Spending exceeds income';
          } else if (expenseRatio > 0.9) {
            // Spending close to earnings
            healthScore = 50 + ((1 - expenseRatio) * 100);
            healthColor = '#FF9800';
            healthMessage = 'Limited savings margin';
          } else {
            // Good savings rate
            healthScore = 70 + ((1 - expenseRatio) * 30);
            healthColor = '#4CAF50';
            healthMessage = 'Good savings rate';
          }
        }
        
        setFinancialHealth({
          score: Math.round(healthScore),
          color: healthColor,
          message: healthMessage,
          improvements: [
            'Create a dedicated emergency fund',
            'Track daily expenses to identify spending leaks',
            'Reduce non-essential purchases'
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching transaction data:', error);
      Alert.alert('Error', 'Failed to load transaction report');
    } finally {
      setLoading(false);
    }
  };
  
  const getRandomColor = (seed) => {
    // Generate a deterministic color based on the category name
    const colors = [
      '#0061FF', '#F75555', '#4CAF50', '#FF9800', 
      '#9C27B0', '#795548', '#009688', '#607D8B'
    ];
    
    const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };
  
  const getCategoryIcon = (iconName) => {
    // Map of valid Ionicons names that work with your categories
    const defaultIcons = {
      'food': 'fast-food-outline',
      'transport': 'bus-outline',
      'housing': 'home-outline',
      'education': 'book-outline',
      'entertainment': 'film-outline', // Changed from 'movie'
      'shopping': 'cart-outline',
      'health': 'fitness-outline',
      'miscellaneous': 'albums-outline'
    };
    
    return defaultIcons[iconName] || iconName || 'albums-outline';
  };
  
  const getPercentage = (amount) => {
    const total = categorySpending.reduce((sum, cat) => sum + cat.amount, 0);
    return total > 0 ? ((amount / total) * 100).toFixed(1) : '0';
  };
  
  const handleGenerateInsights = async () => {
    try {
      setGeneratingInsights(true);
      
      // Call our local implementation to analyze spending trends
      const result = await analyzeSpendingTrends(expenses, period);
      
      if (result.success && result.data) {
        setSpendingInsights(result.data.insights || []);
      } else {
        throw new Error(result.error || 'Failed to generate insights');
      }
    } catch (error) {
      console.error('Error generating spending insights:', error);
      Alert.alert('Error', 'Failed to generate spending insights');
      
      // Fallback to static insights
      setSpendingInsights([
        {
          title: 'Spending Trend',
          description: 'Your spending has been consistent over the past month.',
          type: 'trend'
        },
        {
          title: 'Top Category',
          description: 'Food is your highest spending category at 35% of total expenses.',
          type: 'category'
        },
        {
          title: 'Unusual Expense',
          description: 'There was an unusually large expense in Shopping category last week.',
          type: 'anomaly'
        }
      ]);
    } finally {
      setGeneratingInsights(false);
    }
  };
  
  // Prepare data for pie chart
  const getPieChartData = () => {
    // Only show top categories in chart to avoid cluttering
    const topCategories = categorySpending.slice(0, 5);
    
    // If there are more categories, add an "Other" category
    let otherAmount = 0;
    if (categorySpending.length > 5) {
      for (let i = 5; i < categorySpending.length; i++) {
        otherAmount += categorySpending[i].amount;
      }
    }
    
    const chartData = topCategories.map(cat => ({
      name: cat.name,
      value: cat.amount,
      color: cat.color,
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }));
    
    // Add "Other" category if needed
    if (otherAmount > 0) {
      chartData.push({
        name: 'Other',
        value: otherAmount,
        color: '#CCCCCC',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      });
    }
    
    return chartData;
  };
  
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-accent-100 justify-center items-center">
        <ActivityIndicator size="large" color="#0061FF" />
        <Text className="font-rubik mt-4">Analyzing your transactions...</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView className="flex-1 bg-accent-100">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 flex-row justify-between items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#191D31" />
          </TouchableOpacity>
          <Text className="font-rubik-semibold text-black-300 text-xl flex-1">Transaction Report</Text>
        </View>
        
        {/* Period Toggle */}
        <View className="mx-4 mb-4 bg-primary-100 rounded-xl p-1 flex-row">
          <TouchableOpacity 
            className={`flex-1 py-2 px-4 rounded-lg ${period === 'week' ? 'bg-primary-300' : ''}`}
            onPress={() => setPeriod('week')}
          >
            <Text 
              className={`font-rubik-medium text-center ${period === 'week' ? 'text-white' : 'text-primary-300'}`}
            >
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-2 px-4 rounded-lg ${period === 'month' ? 'bg-primary-300' : ''}`}
            onPress={() => setPeriod('month')}
          >
            <Text 
              className={`font-rubik-medium text-center ${period === 'month' ? 'text-white' : 'text-primary-300'}`}
            >
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-2 px-4 rounded-lg ${period === 'year' ? 'bg-primary-300' : ''}`}
            onPress={() => setPeriod('year')}
          >
            <Text 
              className={`font-rubik-medium text-center ${period === 'year' ? 'text-white' : 'text-primary-300'}`}
            >
              Year
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Financial Health Score */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <Text className="font-rubik-medium text-black-300 text-lg mb-2">Financial Health Score</Text>
          
          <View className="items-center mb-4">
            <View 
              className="w-32 h-32 rounded-full justify-center items-center mb-2"
              style={{ 
                backgroundColor: `${financialHealth.color}20`,
                borderWidth: 8,
                borderColor: financialHealth.color 
              }}
            >
              <Text className="font-rubik-bold text-4xl" style={{ color: financialHealth.color }}>
                {financialHealth.score}
              </Text>
              <Text className="font-rubik text-black-100">out of 100</Text>
            </View>
            
            <Text className="font-rubik-medium text-center mt-2" style={{ color: financialHealth.color }}>
              {financialHealth.message}
            </Text>
          </View>
          
          <View className="mt-2">
            <Text className="font-rubik-medium text-black-300 mb-2">Improvements</Text>
            {financialHealth.improvements.map((improvement, index) => (
              <View key={index} className="flex-row mb-2">
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" className="mr-2" />
                <Text className="font-rubik text-black-200 ml-2">{improvement}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Category Spending Pie Chart */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <Text className="font-rubik-medium text-black-300 text-lg mb-4">Spending Distribution</Text>
          
          {categorySpending.length > 0 ? (
            <PieChart
              data={getPieChartData()}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <View className="items-center justify-center py-8">
              <Ionicons name="pie-chart-outline" size={48} color="#E0E0E0" />
              <Text className="font-rubik text-black-100 mt-2">No expense data available</Text>
            </View>
          )}
        </View>
        
        {/* Top Expenses Categories */}
        <View className="mx-4 mb-4">
          <Text className="font-rubik-medium text-black-300 text-lg mb-2">Top Expense Categories</Text>
          
          {categorySpending.length > 0 ? (
            categorySpending.slice(0, 5).map((category) => (
              <View key={category.id} className="bg-white p-4 rounded-2xl mb-3">
                <View className="flex-row justify-between items-center mb-2">
                  <View className="flex-row items-center">
                    <View 
                      className="w-8 h-8 rounded-full items-center justify-center mr-2"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <Ionicons 
                        name={getCategoryIcon(category.icon)} 
                        size={16} 
                        color={category.color} 
                      />
                    </View>
                    <Text className="font-rubik-medium text-black-300">{category.name}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-rubik-medium text-black-300">${category.amount.toFixed(2)}</Text>
                    <Text className="font-rubik text-black-100 text-xs">{getPercentage(category.amount)}%</Text>
                  </View>
                </View>
                
                <View className="h-2 bg-accent-100 rounded-full w-full">
                  <View 
                    className="h-2 rounded-full" 
                    style={{ 
                      width: `${getPercentage(category.amount)}%`,
                      backgroundColor: category.color 
                    }} 
                  />
                </View>
              </View>
            ))
          ) : (
            <View className="bg-white p-6 rounded-2xl shadow-sm items-center">
              <Ionicons name="wallet-outline" size={48} color="#E0E0E0" />
              <Text className="font-rubik-medium text-black-300 mt-2 mb-1">No Expenses</Text>
              <Text className="font-rubik text-black-100 text-center">
                You haven't recorded any expenses in this period
              </Text>
            </View>
          )}
        </View>
        
        {/* Income vs Expenses */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <Text className="font-rubik-medium text-black-300 text-lg mb-2">Income vs Expenses</Text>
          
          {income.length > 0 || expenses.length > 0 ? (
            <View>
              <View className="flex-row justify-between mb-2">
                <Text className="font-rubik text-black-100">Total Income</Text>
                <Text className="font-rubik-medium text-green-700">
                  ${income.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2)}
                </Text>
              </View>
              
              <View className="flex-row justify-between mb-2">
                <Text className="font-rubik text-black-100">Total Expenses</Text>
                <Text className="font-rubik-medium text-danger">
                  ${expenses.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2)}
                </Text>
              </View>
              
              <View className="border-t border-accent-100 my-2 pt-2">
                <View className="flex-row justify-between">
                  <Text className="font-rubik-medium text-black-300">Net Savings</Text>
                  <Text 
                    className={`font-rubik-bold ${
                      income.reduce((sum, item) => sum + Number(item.amount), 0) > 
                      expenses.reduce((sum, item) => sum + Number(item.amount), 0) 
                        ? 'text-green-700' 
                        : 'text-danger'
                    }`}
                  >
                    ${(
                      income.reduce((sum, item) => sum + Number(item.amount), 0) - 
                      expenses.reduce((sum, item) => sum + Number(item.amount), 0)
                    ).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="items-center py-4">
              <Text className="font-rubik text-black-100">No data available</Text>
            </View>
          )}
        </View>
        
        {/* Spending Insights */}
        <View className="mx-4 mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-rubik-medium text-black-300 text-lg">Spending Insights</Text>
            <TouchableOpacity 
              onPress={handleGenerateInsights}
              disabled={generatingInsights}
            >
              {generatingInsights ? (
                <ActivityIndicator size="small" color="#0061FF" />
              ) : (
                <Text className="font-rubik-medium text-primary-300">Generate</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {spendingInsights.length > 0 ? (
            spendingInsights.map((insight, index) => (
              <View key={index} className="bg-white p-4 rounded-2xl shadow-sm mb-3">
                <View className="flex-row mb-2">
                  <View 
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ 
                      backgroundColor: insight.type === 'trend' 
                        ? '#0061FF20' 
                        : insight.type === 'anomaly' 
                          ? '#F7555520' 
                          : '#4CAF5020' 
                    }}
                  >
                    <Ionicons 
                      name={
                        insight.type === 'trend' 
                          ? 'trending-up-outline' 
                          : insight.type === 'anomaly' 
                            ? 'warning-outline' 
                            : 'pie-chart-outline'
                      } 
                      size={20} 
                      color={
                        insight.type === 'trend' 
                          ? '#0061FF' 
                          : insight.type === 'anomaly' 
                            ? '#F75555' 
                            : '#4CAF50'
                      } 
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-rubik-medium text-black-300 mb-1">{insight.title}</Text>
                    <Text className="font-rubik text-black-100">{insight.description}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View className="bg-white p-6 rounded-2xl shadow-sm items-center">
              <Ionicons name="analytics-outline" size={48} color="#E0E0E0" />
              <Text className="font-rubik-medium text-black-300 mt-2 mb-1">No Insights Yet</Text>
              <Text className="font-rubik text-black-100 text-center mb-4">
                Generate AI insights to understand your spending patterns
              </Text>
              <TouchableOpacity 
                className="bg-primary-300 px-4 py-2 rounded-xl"
                onPress={handleGenerateInsights}
                disabled={generatingInsights}
              >
                {generatingInsights ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="white" />
                    <Text className="font-rubik-medium text-white ml-2">Generating...</Text>
                  </View>
                ) : (
                  <Text className="font-rubik-medium text-white">Generate Insights</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}