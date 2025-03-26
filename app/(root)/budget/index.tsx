// app/(root)/budget/view.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../../contexts/AuthProvider';
import { supabase } from '../../../lib/supabase';

type Budget = {
  id: string;
  name: string;
  description?: string;
  amount: number;
  period: string;
  start_date: string;
  end_date?: string;
  ai_optimized: boolean;
};

export default function BudgetViewPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  
  useEffect(() => {
    fetchBudgets();
  }, []);
  
  const fetchBudgets = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setBudgets(data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      Alert.alert('Error', 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle create new budget
  const handleCreateBudget = () => {
    // In a real app, this would navigate to a budget creation form
    Alert.alert(
      'Create Budget',
      'This would navigate to a budget creation screen in the complete app.'
    );
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get period display text
  const getPeriodText = (period: string) => {
    switch (period.toLowerCase()) {
      case 'daily':
        return 'Per Day';
      case 'weekly':
        return 'Per Week';
      case 'monthly':
        return 'Per Month';
      case 'yearly':
        return 'Per Year';
      default:
        return period;
    }
  };
  
  // Check if a budget is active
  const isBudgetActive = (budget: Budget) => {
    const today = new Date().toISOString().split('T')[0];
    return budget.start_date <= today && (!budget.end_date || budget.end_date >= today);
  };
  
  return (
    <SafeAreaView className="flex-1 bg-accent-100">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity 
              className="mr-3"
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#191D31" />
            </TouchableOpacity>
            <Text className="font-rubik-semibold text-black-300 text-xl">Your Budgets</Text>
          </View>
          
          <TouchableOpacity
            onPress={handleCreateBudget}
          >
            <Ionicons name="add-circle" size={24} color="#0061FF" />
          </TouchableOpacity>
        </View>
        
        {/* Budget List */}
        <View className="p-4">
          {loading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator size="large" color="#0061FF" />
            </View>
          ) : budgets.length > 0 ? (
            budgets.map((budget) => (
              <View 
                key={budget.id} 
                className={`mb-4 p-4 rounded-xl ${isBudgetActive(budget) ? 'bg-white' : 'bg-gray-100'}`}
              >
                <View className="flex-row justify-between items-center mb-2">
                  <View className="flex-row items-center">
                    <View 
                      className={`w-10 h-10 rounded-full items-center justify-center mr-2 ${
                        isBudgetActive(budget) ? 'bg-primary-100' : 'bg-gray-200'
                      }`}
                    >
                      <Ionicons 
                        name={budget.ai_optimized ? "analytics" : "wallet"} 
                        size={20} 
                        color={isBudgetActive(budget) ? "#0061FF" : "#666"} 
                      />
                    </View>
                    <View>
                      <Text 
                        className={`font-rubik-medium ${
                          isBudgetActive(budget) ? 'text-black-300' : 'text-black-100'
                        } text-lg`}
                      >
                        {budget.name}
                      </Text>
                      <Text 
                        className={`font-rubik text-xs ${
                          isBudgetActive(budget) ? 'text-black-100' : 'text-black-100 opacity-60'
                        }`}
                      >
                        {budget.ai_optimized ? 'AI Optimized' : 'Manual'} • {getPeriodText(budget.period)}
                      </Text>
                    </View>
                  </View>
                  <Text 
                    className={`font-rubik-bold ${
                      isBudgetActive(budget) ? 'text-primary-300' : 'text-black-100'
                    } text-lg`}
                  >
                    {formatCurrency(budget.amount)}
                  </Text>
                </View>
                
                {budget.description && (
                  <Text className="font-rubik text-black-100 text-sm mb-2">
                    {budget.description}
                  </Text>
                )}
                
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="font-rubik text-black-100 text-xs">
                    {`${formatDate(budget.start_date)}${budget.end_date ? ` - ${formatDate(budget.end_date)}` : ' (No end date)'}`}
                  </Text>
                  
                  <View className="flex-row">
                    <TouchableOpacity 
                      className="mr-4"
                      onPress={() => {
                        // In a real app, this would navigate to budget edit screen
                        Alert.alert('Edit Budget', `Would edit budget ${budget.id}`);
                      }}
                    >
                      <Ionicons name="create-outline" size={18} color="#0061FF" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => {
                        // In a real app, this would confirm deletion
                        Alert.alert('Delete Budget', `Would delete budget ${budget.id}`);
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#F75555" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View className="items-center justify-center py-12">
              <Ionicons name="wallet-outline" size={64} color="#CCCCCC" />
              <Text className="font-rubik-medium text-black-200 text-lg mt-4">No budgets yet</Text>
              <Text className="font-rubik text-black-100 text-center mt-2 mb-6">
                Create your first budget to start tracking your expenses
              </Text>
              
              <TouchableOpacity 
                className="bg-primary-300 py-3 px-6 rounded-xl flex-row items-center"
                onPress={handleCreateBudget}
              >
                <Ionicons name="add-circle" size={20} color="white" />
                <Text className="font-rubik-medium text-white ml-2">Create Budget</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}