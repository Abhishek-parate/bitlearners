import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { supabase } from '@supabase/supabase-js'; // Assuming you have this set up
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthProvider';

const HomePage = () => {
  const [budgetSummary, setBudgetSummary] = useState({
    totalBudget: 1200,
    spent: 650,
    remaining: 550,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const navigation = useNavigation();

  const [categories, setCategories] = useState([
    { id: 1, name: 'Food', icon: 'fast-food', spent: 250, limit: 400, color: '#0061FF' },
    { id: 2, name: 'Transport', icon: 'bus', spent: 120, limit: 200, color: '#F75555' },
    { id: 3, name: 'Books', icon: 'book', spent: 180, limit: 250, color: '#4CAF50' },
    { id: 4, name: 'Entertainment', icon: 'film', spent: 100, limit: 150, color: '#FF9800' },
  ]);
  
  // Sample chart data
  const spendingData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43, 50],
        color: () => '#0061FF',
        strokeWidth: 2,
      },
    ],
  };

  // Get user from auth context
  const { user } = useAuth();
  
  // Get display name from user object
  const displayName = user?.user_metadata?.full_name || user?.email || "Student";

  const handleSetBudget = () => {
    router.replace('/budget');
  };

  const handleSetExpense = () => {
    router.replace('/expense');
  };

  useEffect(() => {
    // Fetch recent transactions
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data) setRecentTransactions(data);
    };

    fetchTransactions();
  }, []);

  // Calculate percentage spent
  const percentageSpent = (budgetSummary.spent / budgetSummary.totalBudget) * 100;

  return (
    <SafeAreaView className="flex-1 bg-accent-100">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 flex-row justify-between items-center">
          <View>
            <Text className="font-rubik-medium text-black-300 text-xl">Hello, {displayName}</Text>
            <Text className="font-rubik text-black-100">Let's manage your budget!</Text>
          </View>
          <TouchableOpacity className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center">
            <Ionicons name="notifications-outline" size={20} color="#0061FF" />
          </TouchableOpacity>
        </View>

        {/* Budget Summary Card */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <Text className="font-rubik-medium text-black-300 text-lg mb-2">Monthly Budget</Text>
          
          {/* Progress bar */}
          <View className="h-4 bg-primary-100 rounded-full w-full mb-2">
            <View 
              className="h-4 bg-primary-300 rounded-full" 
              style={{ width: `${percentageSpent}%` }} 
            />
          </View>
          
          <View className="flex-row justify-between">
            <View>
              <Text className="font-rubik text-black-100">Spent</Text>
              <Text className="font-rubik-bold text-black-300">${budgetSummary.spent}</Text>
            </View>
            <View>
              <Text className="font-rubik text-black-100">Remaining</Text>
              <Text className="font-rubik-bold text-primary-300">${budgetSummary.remaining}</Text>
            </View>
            <View>
              <Text className="font-rubik text-black-100">Total</Text>
              <Text className="font-rubik-bold text-black-300">${budgetSummary.totalBudget}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mx-4 flex-row justify-between mb-4">
          <TouchableOpacity onPress={handleSetExpense}  className="bg-primary-300 px-4 py-3 rounded-xl flex-row items-center w-[48%]">
            <Ionicons name="add-circle" size={24} color="white" />
            <Text className="font-rubik-medium text-white ml-2" >Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSetBudget} className="bg-white border border-primary-300 px-4 py-3 rounded-xl flex-row items-center w-[48%]">
            <Ionicons name="arrow-forward-circle" size={24} color="#0061FF" />
            <Text className="font-rubik-medium text-primary-300 ml-2" >Set Budget</Text>
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
          
          {categories.map((category) => (
            <View key={category.id} className="mb-3">
              <View className="flex-row justify-between items-center mb-1">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center mr-2">
                    <Ionicons name={category.icon} size={16} color={category.color} />
                  </View>
                  <Text className="font-rubik text-black-300">{category.name}</Text>
                </View>
                <Text className="font-rubik-medium text-black-300">${category.spent} / ${category.limit}</Text>
              </View>
              
              {/* Category progress bar */}
              <View className="h-2 bg-primary-100 rounded-full w-full">
                <View 
                  className="h-2 rounded-full" 
                  style={{ 
                    width: `${(category.spent / category.limit) * 100}%`,
                    backgroundColor: category.color 
                  }} 
                />
              </View>
            </View>
          ))}

          <TouchableOpacity className="mt-2">
            <Text className="font-rubik-medium text-primary-300 text-center">View All Categories</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-rubik-medium text-black-300 text-lg">Recent Transactions</Text>
            <TouchableOpacity>
              <Text className="font-rubik-medium text-primary-300">See All</Text>
            </TouchableOpacity>
          </View>
          
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction, index) => (
              <View key={index} className="flex-row justify-between items-center mb-3 pb-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
                    <Ionicons name="cart-outline" size={20} color="#0061FF" />
                  </View>
                  <View>
                    <Text className="font-rubik-medium text-black-300">{transaction.description}</Text>
                    <Text className="font-rubik text-black-100 text-xs">{new Date(transaction.created_at).toLocaleDateString()}</Text>
                  </View>
                </View>
                <Text className="font-rubik-bold text-danger">-${transaction.amount}</Text>
              </View>
            ))
          ) : (
            // Placeholder transactions
            [1, 2, 3].map((item) => (
              <View key={item} className="flex-row justify-between items-center mb-3 pb-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
                    <Ionicons 
                      name={item === 1 ? "fast-food-outline" : item === 2 ? "bus-outline" : "book-outline"} 
                      size={20} 
                      color="#0061FF" 
                    />
                  </View>
                  <View>
                    <Text className="font-rubik-medium text-black-300">
                      {item === 1 ? "Lunch" : item === 2 ? "Bus Fare" : "Textbook"}
                    </Text>
                    <Text className="font-rubik text-black-100 text-xs">Today</Text>
                  </View>
                </View>
                <Text className="font-rubik-bold text-danger">
                  -${item === 1 ? "12.50" : item === 2 ? "5.00" : "45.99"}
                </Text>
              </View>
            ))
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
      </ScrollView>

 
    </SafeAreaView>
  );
};

export default HomePage;