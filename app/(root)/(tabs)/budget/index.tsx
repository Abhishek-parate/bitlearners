// app/(root)/(tabs)/budget/list.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Import Supabase functions
import { getBudgets, getBudgetDetails, getExpenses } from '@/lib/supabase';

export default function BudgetListPage() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budgetDetails, setBudgetDetails] = useState({});

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      
      // Fetch all budgets
      const budgetsData = await getBudgets();
      
      if (budgetsData && budgetsData.length > 0) {
        setBudgets(budgetsData);
        
        // Fetch details and spending for each budget
        const detailsMap = {};
        
        await Promise.all(
          budgetsData.map(async (budget) => {
            // Get budget details with allocations
            const details = await getBudgetDetails(budget.id);
            
            // Get actual spending for this budget period
            const spending = await getExpenses({
              budget_id: budget.id,
              start_date: budget.start_date,
              end_date: budget.end_date
            });
            
            // Calculate total spending
            const totalSpending = spending.reduce((sum, expense) => sum + Number(expense.amount), 0);
            
            // Store in map
            detailsMap[budget.id] = {
              details,
              totalSpending,
              spendingPercent: (totalSpending / Number(budget.amount)) * 100
            };
          })
        );
        
        setBudgetDetails(detailsMap);
      }
    } catch (error) {
      console.error('Error fetching budgets:', error);
      Alert.alert('Error', 'Failed to load budgets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBudgets();
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const navigateToBudgetDetail = (budgetId) => {
    router.push({
      pathname: '/budget/[id]',
      params: { id: budgetId }
    });
  };

  const handleAddBudget = () => {
    router.push('/budget/add');
  };

  const getBudgetTimeStatus = (startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) {
      return { status: 'upcoming', text: 'Upcoming' };
    } else if (now > end) {
      return { status: 'expired', text: 'Expired' };
    } else {
      return { status: 'active', text: 'Active' };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'upcoming':
        return '#FF9800';
      case 'expired':
        return '#F75555';
      default:
        return '#8C8E98';
    }
  };

  const getSpendingStatusColor = (percent) => {
    if (percent > 100) {
      return '#F75555'; // Over budget - red
    } else if (percent > 80) {
      return '#FF9800'; // Near limit - orange
    } else {
      return '#4CAF50'; // Good - green
    }
  };

  const renderBudgetItem = ({ item }) => {
    const { status, text } = getBudgetTimeStatus(item.start_date, item.end_date);
    const statusColor = getStatusColor(status);
    
    // Get spending info from details map
    const details = budgetDetails[item.id] || {};
    const totalSpending = details.totalSpending || 0;
    const spendingPercent = details.spendingPercent || 0;
    const spendingColor = getSpendingStatusColor(spendingPercent);
    
    return (
      <TouchableOpacity
        className="bg-white p-4 rounded-2xl mx-4 mb-4 shadow-sm"
        onPress={() => navigateToBudgetDetail(item.id)}
      >
        <View className="flex-row justify-between items-center mb-3">
          <View>
            <Text className="font-rubik-semibold text-black-300 text-lg">{item.name}</Text>
            <Text className="font-rubik text-black-100 text-xs">
              {formatDateRange(item.start_date, item.end_date)}
            </Text>
          </View>
          <View className="px-3 py-1 rounded-full" style={{ backgroundColor: `${statusColor}20` }}>
            <Text className="font-rubik-medium text-xs" style={{ color: statusColor }}>
              {text}
            </Text>
          </View>
        </View>
        
        <View className="flex-row justify-between mb-2">
          <Text className="font-rubik text-black-100">Total Budget</Text>
          <Text className="font-rubik-medium text-black-300">{formatCurrency(item.amount)}</Text>
        </View>
        
        <View className="flex-row justify-between mb-3">
          <Text className="font-rubik text-black-100">Spent</Text>
          <View className="flex-row items-center">
            <Text 
              className="font-rubik-medium mr-1"
              style={{ color: spendingColor }}
            >
              {formatCurrency(totalSpending)}
            </Text>
            <Text className="font-rubik text-black-100 text-xs">
              ({Math.round(spendingPercent)}%)
            </Text>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <View 
            className="h-full rounded-full"
            style={{ 
              width: `${Math.min(spendingPercent, 100)}%`,
              backgroundColor: spendingColor
            }}
          />
        </View>
        
        {/* AI Optimized Badge */}
        {item.ai_optimized && (
          <View className="mt-3 flex-row items-center">
            <Ionicons name="flash-outline" size={14} color="#0061FF" />
            <Text className="font-rubik text-primary-300 text-xs ml-1">AI Optimized</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-accent-100">
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 flex-row items-center justify-between">
          <Text className="font-rubik-semibold text-black-300 text-xl">Your Budgets</Text>
          <TouchableOpacity 
            className="p-2"
            onPress={() => router.push('/budget/insights')}
          >
            <Ionicons name="analytics-outline" size={24} color="#191D31" />
          </TouchableOpacity>
        </View>
        
        {/* Budget List */}
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#0061FF" />
          </View>
        ) : budgets.length > 0 ? (
          <FlatList
            data={budgets}
            renderItem={renderBudgetItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 4 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0061FF"]} />
            }
          />
        ) : (
          <View className="flex-1 justify-center items-center px-4">
            <Ionicons name="wallet-outline" size={64} color="#8C8E98" />
            <Text className="font-rubik-medium text-black-200 text-lg mt-4 mb-2">No budgets yet</Text>
            <Text className="font-rubik text-black-100 text-center mb-6">
              Create your first budget to start tracking your expenses more effectively.
            </Text>
            <TouchableOpacity 
              className="bg-primary-300 p-4 rounded-xl w-40"
              onPress={handleAddBudget}
            >
              <Text className="font-rubik-medium text-white text-center">Create Budget</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Add Button */}
        {budgets.length > 0 && (
          <TouchableOpacity 
            className="absolute bottom-6 right-6 bg-primary-300 w-14 h-14 rounded-full items-center justify-center shadow-md"
            onPress={handleAddBudget}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}