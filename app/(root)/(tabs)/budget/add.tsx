// app/(root)/(tabs)/budget/add.tsx
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
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
// Import Slider properly - Add this line
import Slider from '@react-native-community/slider';

// Import Supabase functions
import { 
  getCategories,
  getExpenses,
  getIncome,
  createBudget,
  createBudgetAllocation
} from '@/lib/supabase';

// Create a custom slider component as fallback if needed
const CustomSlider = ({ value, onValueChange, minimumValue = 0, maximumValue = 100, minimumTrackTintColor = '#0061FF', maximumTrackTintColor = '#E0E0E0', thumbTintColor = '#0061FF', style = {} }) => {
  return (
    <View style={[{ flex: 1, height: 40 }, style]}>
      <View style={{ backgroundColor: maximumTrackTintColor, height: 4, borderRadius: 2 }}>
        <View 
          style={{ 
            width: `${Math.min(100, (value / maximumValue) * 100)}%`,
            backgroundColor: minimumTrackTintColor,
            height: 4,
            borderRadius: 2
          }} 
        />
      </View>
      <TouchableOpacity
        style={{
          position: 'absolute',
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: thumbTintColor,
          top: -8,
          left: `${Math.min(100, (value / maximumValue) * 100)}%`,
          marginLeft: -10
        }}
      />
    </View>
  );
};

export default function CreateBudgetPage() {
  const [name, setName] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [description, setDescription] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().setMonth(new Date().getMonth() + 1)));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [totalIncome, setTotalIncome] = useState(0);

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const categoriesData = await getCategories();
      
      if (categoriesData && categoriesData.length > 0) {
        setCategories(categoriesData);
        
        // Initialize allocations with zero amounts
        const initialAllocations = categoriesData.map(category => ({
          category_id: category.id,
          category: category,
          amount: 0,
          percentage: 0
        }));
        
        setAllocations(initialAllocations);
      }
      
      // Fetch income to set as default total budget
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const filters = {
        start_date: firstDayOfMonth.toISOString().split('T')[0],
        end_date: lastDayOfMonth.toISOString().split('T')[0]
      };
      
      const incomeData = await getIncome(filters);
      
      if (incomeData && incomeData.length > 0) {
        const monthlyIncome = incomeData.reduce((sum, income) => sum + Number(income.amount), 0);
        setTotalIncome(monthlyIncome);
        setTotalBudget(monthlyIncome.toString());
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      Alert.alert('Error', 'Failed to load categories and income data');
    } finally {
      setLoading(false);
    }
  };

  const onStartDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || startDate;
    setShowStartDatePicker(Platform.OS === 'ios');
    setStartDate(currentDate);
  };

  const onEndDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || endDate;
    setShowEndDatePicker(Platform.OS === 'ios');
    setEndDate(currentDate);
  };

  const handleAllocationChange = (value, index) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    const updatedAllocations = [...allocations];
    updatedAllocations[index].amount = numValue;
    
    // Recalculate percentages based on total budget
    if (totalBudget && parseFloat(totalBudget) > 0) {
      updatedAllocations[index].percentage = (numValue / parseFloat(totalBudget)) * 100;
    }
    
    setAllocations(updatedAllocations);
  };

  const handleSliderChange = (value, index) => {
    if (!totalBudget || parseFloat(totalBudget) <= 0) return;
    
    const totalValue = parseFloat(totalBudget);
    const newBudget = (value / 100) * totalValue;
    
    const updatedAllocations = [...allocations];
    updatedAllocations[index].amount = newBudget;
    updatedAllocations[index].percentage = value;
    
    setAllocations(updatedAllocations);
  };

  const calculatePercentages = () => {
    if (!totalBudget || parseFloat(totalBudget) <= 0) return;
    
    const updatedAllocations = allocations.map(alloc => ({
      ...alloc,
      percentage: (alloc.amount / parseFloat(totalBudget)) * 100
    }));
    
    setAllocations(updatedAllocations);
  };

  const handleTotalBudgetChange = (value) => {
    setTotalBudget(value);
    
    // Recalculate all percentages
    if (value && parseFloat(value) > 0) {
      const total = parseFloat(value);
      const updatedAllocations = allocations.map(alloc => ({
        ...alloc,
        percentage: (alloc.amount / total) * 100
      }));
      
      setAllocations(updatedAllocations);
    }
  };

  const handleSmartAllocation = async () => {
    if (!totalBudget || parseFloat(totalBudget) <= 0) {
      Alert.alert('Set Total Budget', 'Please set a total budget first');
      return;
    }

    try {
      setGeneratingAI(true);
      
      // Get expense history for the last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const filters = {
        start_date: threeMonthsAgo.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      };
      
      const [expensesData, incomeData] = await Promise.all([
        getExpenses(filters),
        getIncome(filters)
      ]);
      
      if (!expensesData || expensesData.length === 0) {
        // If no expense history, distribute evenly
        const total = parseFloat(totalBudget);
        const count = categories.length;
        const updatedAllocations = [...allocations];
        
        updatedAllocations.forEach((alloc) => {
          alloc.amount = total / count;
          alloc.percentage = 100 / count;
        });
        
        setAllocations(updatedAllocations);
        Alert.alert('Smart Allocation', 'No spending history found. Budget distributed evenly.');
        return;
      }
      
      // Simple algorithm based on spending history
      // Calculate average spending per category
      const categorySpending = {};
      let totalSpending = 0;
      
      expensesData.forEach(expense => {
        const catId = expense.category_id;
        if (!catId) return;
        
        categorySpending[catId] = (categorySpending[catId] || 0) + Number(expense.amount);
        totalSpending += Number(expense.amount);
      });
      
      // If there's spending data, allocate based on historical percentages
      if (totalSpending > 0) {
        const total = parseFloat(totalBudget);
        const updatedAllocations = allocations.map(alloc => {
          const historicalSpending = categorySpending[alloc.category_id] || 0;
          const spendingPercentage = (historicalSpending / totalSpending) * 100;
          const recommendedAmount = (spendingPercentage / 100) * total;
          
          return {
            ...alloc,
            amount: recommendedAmount,
            percentage: spendingPercentage
          };
        });
        
        setAllocations(updatedAllocations);
        Alert.alert('Smart Allocation', 'Budget allocated based on your spending history');
      } else {
        // Fall back to even distribution
        const count = categories.length;
        const updatedAllocations = [...allocations];
        const total = parseFloat(totalBudget);
        
        updatedAllocations.forEach((alloc) => {
          alloc.amount = total / count;
          alloc.percentage = 100 / count;
        });
        
        setAllocations(updatedAllocations);
        Alert.alert('Smart Allocation', 'No spending patterns found. Budget distributed evenly.');
      }
    } catch (error) {
      console.error('Error in smart allocation:', error);
      Alert.alert('Error', 'Failed to generate smart allocation');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleCreateBudget = async () => {
    if (!name || !totalBudget || parseFloat(totalBudget) <= 0) {
      Alert.alert('Missing Fields', 'Please provide a name and valid total budget');
      return;
    }

    // Check that allocations don't exceed total budget
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    if (totalAllocated > parseFloat(totalBudget)) {
      Alert.alert('Budget Exceeded', 'Your allocations exceed your total budget. Please adjust.');
      return;
    }

    try {
      setSubmitting(true);
      
      // Format date range
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      // Create the budget first
      const budgetData = {
        name,
        description,
        amount: parseFloat(totalBudget),
        period,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        ai_optimized: generatingAI
      };
      
      const newBudget = await createBudget(budgetData);
      
      if (!newBudget || !newBudget.id) {
        throw new Error('Failed to create budget');
      }
      
      // Create all allocations that have amounts greater than 0
      const validAllocations = allocations.filter(alloc => alloc.amount > 0);
      
      if (validAllocations.length > 0) {
        const allocationPromises = validAllocations.map(alloc => 
          createBudgetAllocation(newBudget.id, alloc.category_id, alloc.amount)
        );
        
        await Promise.all(allocationPromises);
      }
      
      Alert.alert('Success', 'Budget created successfully', [
        { text: 'OK', onPress: () => router.push('/budget/list') }
      ]);
    } catch (error) {
      console.error('Error creating budget:', error);
      Alert.alert('Error', 'Failed to create budget');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-accent-100 justify-center items-center">
        <ActivityIndicator size="large" color="#0061FF" />
        <Text className="font-rubik mt-4">Loading...</Text>
      </SafeAreaView>
    );
  }

  // Calculate unallocated amount
  const totalAllocated = allocations.reduce((sum, alloc) => sum + (alloc.amount || 0), 0);
  const unallocated = totalBudget ? parseFloat(totalBudget) - totalAllocated : 0;

  return (
    <SafeAreaView className="flex-1 bg-accent-100">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1">
          {/* Header */}
          <View className="px-4 py-4 flex-row items-center">
            <TouchableOpacity onPress={handleGoBack} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="#191D31" />
            </TouchableOpacity>
            <Text className="font-rubik-semibold text-black-300 text-xl">Create Budget</Text>
          </View>

          {/* Budget Name */}
          <View className="mx-4 mb-4">
            <Text className="font-rubik text-black-100 mb-2">Budget Name</Text>
            <TextInput
              className="bg-white p-4 rounded-2xl font-rubik text-black-300"
              placeholder="e.g. March 2025 Budget"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Description */}
          <View className="mx-4 mb-4">
            <Text className="font-rubik text-black-100 mb-2">Description (Optional)</Text>
            <TextInput
              className="bg-white p-4 rounded-2xl font-rubik text-black-300"
              placeholder="Add a description"
              value={description}
              onChangeText={setDescription}
              multiline
            />
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

          {/* Date Range */}
          <View className="mx-4 mb-4">
            <Text className="font-rubik text-black-100 mb-2">Budget Date Range</Text>
            <View className="flex-row justify-between">
              <TouchableOpacity 
                onPress={() => setShowStartDatePicker(true)}
                className="bg-white p-4 rounded-2xl flex-1 mr-2"
              >
                <Text className="font-rubik-medium text-black-100 text-xs mb-1">Start Date</Text>
                <Text className="font-rubik text-black-300">
                  {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setShowEndDatePicker(true)}
                className="bg-white p-4 rounded-2xl flex-1"
              >
                <Text className="font-rubik-medium text-black-100 text-xs mb-1">End Date</Text>
                <Text className="font-rubik text-black-300">
                  {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
            </View>

            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={onStartDateChange}
              />
            )}

            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={onEndDateChange}
              />
            )}
          </View>

          {/* Income Info */}
          {totalIncome > 0 && (
            <View className="mx-4 mb-4 bg-white p-4 rounded-2xl">
              <Text className="font-rubik text-black-100 mb-1">Monthly Income</Text>
              <Text className="font-rubik-semibold text-green-500">${totalIncome.toFixed(2)}</Text>
            </View>
          )}

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
            
            {totalIncome > 0 && parseFloat(totalBudget || '0') > totalIncome && (
              <Text className="font-rubik text-danger text-xs mt-2">
                Warning: Your budget exceeds your income
              </Text>
            )}
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

          {/* Smart Allocation Button */}
          <View className="mx-4 mb-4">
            <TouchableOpacity 
              className="bg-primary-300 p-4 rounded-xl flex-row items-center justify-center"
              onPress={handleSmartAllocation}
              disabled={generatingAI}
            >
              {generatingAI ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="flash-outline" size={20} color="white" />
                  <Text className="font-rubik-medium text-white ml-2">Smart Budget Allocation</Text>
                </>
              )}
            </TouchableOpacity>
            <Text className="font-rubik text-black-100 text-xs text-center mt-2">
              Uses your spending history to intelligently allocate your budget
            </Text>
          </View>

          {/* Category Allocations */}
          <View className="mx-4 mb-4">
            <Text className="font-rubik-medium text-black-300 text-lg mb-2">Category Allocations</Text>
            
            {allocations.map((allocation, index) => (
              <View key={allocation.category_id} className="bg-white p-4 rounded-2xl mb-3">
                <View className="flex-row justify-between items-center mb-2">
                  <View className="flex-row items-center">
                    <View 
                      className="w-8 h-8 rounded-full items-center justify-center mr-2"
                      style={{ backgroundColor: `${allocation.category.color || '#0061FF'}20` }}
                    >
                      <Ionicons 
                        name={allocation.category.icon || 'grid-outline'} 
                        size={16} 
                        color={allocation.category.color || '#0061FF'} 
                      />
                    </View>
                    <Text className="font-rubik-medium text-black-300">{allocation.category.name}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="font-rubik text-black-300 mr-1">$</Text>
                    <TextInput
                      className="font-rubik text-black-300 w-20 text-right"
                      keyboardType="decimal-pad"
                      value={allocation.amount ? allocation.amount.toString() : ''}
                      onChangeText={(value) => handleAllocationChange(value, index)}
                    />
                  </View>
                </View>
                
                <View className="flex-row items-center">
                  {/* Use Slider component here */}
                  {typeof Slider !== 'undefined' ? (
                    <Slider
                      style={{flex: 1, height: 40}}
                      minimumValue={0}
                      maximumValue={100}
                      step={1}
                      value={allocation.percentage || 0}
                      onValueChange={(value) => handleSliderChange(value, index)}
                      minimumTrackTintColor={allocation.category.color || '#0061FF'}
                      maximumTrackTintColor="#E0E0E0"
                      thumbTintColor={allocation.category.color || '#0061FF'}
                    />
                  ) : (
                    // Use our custom slider as fallback
                    <CustomSlider
                      value={allocation.percentage || 0}
                      onValueChange={(value) => handleSliderChange(value, index)}
                      minimumTrackTintColor={allocation.category.color || '#0061FF'}
                      maximumTrackTintColor="#E0E0E0"
                      thumbTintColor={allocation.category.color || '#0061FF'}
                    />
                  )}
                  <Text className="font-rubik text-black-100 ml-2 w-12 text-right">
                    {Math.round(allocation.percentage || 0)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Save Button */}
          <View className="mx-4 mb-6">
            <TouchableOpacity 
              className="bg-primary-300 p-4 rounded-xl"
              onPress={handleCreateBudget}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="font-rubik-medium text-white text-center">Create Budget</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}