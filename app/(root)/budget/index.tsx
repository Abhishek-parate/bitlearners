import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@supabase/supabase-js';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';

const SetBudgetPage = () => {
  const navigation = useNavigation();
  const [totalBudget, setTotalBudget] = useState('');
  const [allocations, setAllocations] = useState([]);
  const [unallocated, setUnallocated] = useState(0);
  const [period, setPeriod] = useState('monthly'); // monthly, weekly, yearly

  useEffect(() => {
    // Fetch categories and current budget allocations
    const fetchCategoriesAndBudgets = async () => {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('*');
      
      if (categories) {
        // Fetch existing budgets for each category
        const { data: budgets, error: budgetError } = await supabase
          .from('budgets')
          .select('*')
          .eq('period', period);

        const initialAllocations = categories.map(category => {
          const existingBudget = budgets?.find(b => b.category_id === category.id);
          return {
            ...category,
            budget: existingBudget?.amount || 0,
            percentage: 0
          };
        });

        setAllocations(initialAllocations);
        
        // If existing total budget, set it
        if (budgets && budgets.length > 0) {
          const total = budgets.reduce((sum, budget) => sum + budget.amount, 0);
          setTotalBudget(total.toString());
          calculatePercentages(total.toString(), initialAllocations);
        }
      }
    };

    fetchCategoriesAndBudgets();
  }, [period]);

  useEffect(() => {
    // Calculate unallocated amount
    if (totalBudget) {
      const allocated = allocations.reduce((sum, cat) => sum + (cat.budget || 0), 0);
      setUnallocated(parseFloat(totalBudget) - allocated);
    }
  }, [totalBudget, allocations]);

  const calculatePercentages = (total, allocs = allocations) => {
    if (!total || parseFloat(total) === 0) return;
    
    const updatedAllocations = allocs.map(cat => ({
      ...cat,
      percentage: (cat.budget / parseFloat(total)) * 100
    }));
    
    setAllocations(updatedAllocations);
  };

  const handleTotalBudgetChange = (value) => {
    setTotalBudget(value);
    calculatePercentages(value);
  };

  const handleAllocationChange = (value, index) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    const updatedAllocations = [...allocations];
    updatedAllocations[index].budget = numValue;
    setAllocations(updatedAllocations);
    calculatePercentages(totalBudget, updatedAllocations);
  };

  const handleSliderChange = (value, index) => {
    if (!totalBudget) return;
    
    const totalValue = parseFloat(totalBudget);
    const newBudget = (value / 100) * totalValue;
    
    const updatedAllocations = [...allocations];
    updatedAllocations[index].budget = newBudget;
    updatedAllocations[index].percentage = value;
    
    setAllocations(updatedAllocations);
  };

  const handleSaveBudget = async () => {
    if (!totalBudget || parseFloat(totalBudget) <= 0) {
      Alert.alert('Invalid Budget', 'Please enter a valid total budget');
      return;
    }

    // Delete existing budgets for this period
    await supabase
      .from('budgets')
      .delete()
      .eq('period', period);

    // Insert new budgets
    const budgetData = allocations
      .filter(cat => cat.budget > 0)
      .map(cat => ({
        category_id: cat.id,
        amount: cat.budget,
        period: period
      }));

    const { data, error } = await supabase
      .from('budgets')
      .insert(budgetData);

    if (error) {
      Alert.alert('Error', 'Failed to save budget');
      console.error(error);
      return;
    }

    Alert.alert('Success', 'Budget saved successfully');
    navigation.goBack();
  };

  const handleGoBack = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-accent-100">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1">
          {/* Header */}
          <View className="px-4 py-4 flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4" onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={24} color="#191D31" />
            </TouchableOpacity>
            <Text className="font-rubik-semibold text-black-300 text-xl">Set Budget</Text>
          </View>

          {/* Period Selection */}
          <View className="mx-4 mb-4 bg-white p-3 rounded-2xl">
            <Text className="font-rubik text-black-100 mb-2">Budget Period</Text>
            <View className="flex-row">
              <TouchableOpacity 
                className={`flex-1 py-3 rounded-xl ${period === 'weekly' ? 'bg-primary-200' : 'bg-accent-100'}`}
                onPress={() => setPeriod('weekly')}
              >
                <Text className={`text-center font-rubik-medium ${period === 'weekly' ? 'text-primary-300' : 'text-black-200'}`}>Weekly</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className={`flex-1 py-3 rounded-xl ${period === 'monthly' ? 'bg-primary-200' : 'bg-accent-100'}`}
                onPress={() => setPeriod('monthly')}
              >
                <Text className={`text-center font-rubik-medium ${period === 'monthly' ? 'text-primary-300' : 'text-black-200'}`}>Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className={`flex-1 py-3 rounded-xl ${period === 'yearly' ? 'bg-primary-200' : 'bg-accent-100'}`}
                onPress={() => setPeriod('yearly')}
              >
                <Text className={`text-center font-rubik-medium ${period === 'yearly' ? 'text-primary-300' : 'text-black-200'}`}>Yearly</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Total Budget Input */}
          <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
            <Text className="font-rubik text-black-100 mb-2">Total Budget</Text>
            <View className="flex-row items-center">
              <Text className="font-rubik-medium text-black-300 text-xl mr-2">$</Text>
              <TextInput
                className="font-rubik-semibold text-black-300 text-3xl flex-1"
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={totalBudget}
                onChangeText={handleTotalBudgetChange}
              />
            </View>
          </View>

          {/* Unallocated Amount */}
          <View className="mx-4 mb-4">
            <View className="flex-row justify-between items-center">
              <Text className="font-rubik text-black-100">Unallocated</Text>
              <Text 
                className={`font-rubik-medium ${unallocated < 0 ? 'text-danger' : 'text-black-300'}`}
              >
                ${unallocated.toFixed(2)}
              </Text>
            </View>
            {unallocated < 0 && (
              <Text className="font-rubik text-danger text-xs mt-1">
                Warning: You've allocated more than your total budget
              </Text>
            )}
          </View>

          {/* Category Allocations */}
          <View className="mx-4 mb-4">
            <Text className="font-rubik-medium text-black-300 text-lg mb-2">Category Allocations</Text>
            
            {allocations.map((category, index) => (
              <View key={category.id} className="bg-white p-4 rounded-2xl mb-3">
                <View className="flex-row justify-between items-center mb-2">
                  <View className="flex-row items-center">
                    <View 
                      className="w-8 h-8 rounded-full items-center justify-center mr-2"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <Ionicons name={category.icon} size={16} color={category.color} />
                    </View>
                    <Text className="font-rubik-medium text-black-300">{category.name}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="font-rubik text-black-300 mr-1">$</Text>
                    <TextInput
                      className="font-rubik text-black-300 w-16 text-right"
                      keyboardType="decimal-pad"
                      value={category.budget ? category.budget.toString() : ''}
                      onChangeText={(value) => handleAllocationChange(value, index)}
                    />
                  </View>
                </View>
                
                <View className="flex-row items-center">
                  <Slider
                    style={{flex: 1, height: 40}}
                    minimumValue={0}
                    maximumValue={100}
                    step={1}
                    value={category.percentage || 0}
                    onValueChange={(value) => handleSliderChange(value, index)}
                    minimumTrackTintColor={category.color}
                    maximumTrackTintColor="#E0E0E0"
                    thumbTintColor={category.color}
                  />
                  <Text className="font-rubik text-black-100 ml-2 w-12 text-right">
                    {Math.round(category.percentage || 0)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Smart Allocation */}
          <View className="mx-4 mb-4">
            <TouchableOpacity 
              className="bg-white p-4 rounded-2xl flex-row items-center justify-center"
              onPress={() => {
                if (!totalBudget || parseFloat(totalBudget) <= 0) {
                  Alert.alert('Set Total Budget', 'Please set a total budget first');
                  return;
                }

                // Apply 50/30/20 rule or another smart allocation strategy
                const total = parseFloat(totalBudget);
                const updatedAllocations = [...allocations];
                
                // Simple approach: distribute evenly for now
                const count = updatedAllocations.length;
                updatedAllocations.forEach((cat, idx) => {
                  cat.budget = total / count;
                  cat.percentage = 100 / count;
                });
                
                setAllocations(updatedAllocations);
              }}
            >
              <Ionicons name="flash-outline" size={20} color="#0061FF" className="mr-2" />
              <Text className="font-rubik-medium text-primary-300 ml-2">Smart Allocation</Text>
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <View className="mx-4 mb-6">
            <TouchableOpacity 
              className="bg-primary-300 p-4 rounded-xl"
              onPress={handleSaveBudget}
            >
              <Text className="font-rubik-medium text-white text-center">Save Budget</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SetBudgetPage;