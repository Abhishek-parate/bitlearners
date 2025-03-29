// app/(root)/(tabs)/savings/index.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';

// Import Supabase functions
import { 
  getSavingsGoals, 
  createSavingsGoal, 
  updateSavingsGoal, 
  getExpenses, 
  getIncome,
  supabase // Import supabase client for delete functionality
} from '@/lib/supabase';

// Import AI services if available
// If not implemented yet, create dummy function for generateSavingsRecommendations
const generateSavingsRecommendations = async (expenses, budgets, savingsGoals) => {
  // Dummy implementation if AI service isn't ready
  return {
    success: true,
    data: {
      recommendations: [
        {
          title: "Reduce Dining Out",
          description: "Your spending on restaurants is high. Try cooking at home more often to save money.",
          potentialSavings: 120.00
        },
        {
          title: "Review Subscriptions",
          description: "Review your monthly subscriptions and cancel unused services.",
          potentialSavings: 45.00
        }
      ]
    }
  };
};

export default function SavingsGoalsPage() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [deadline, setDeadline] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [savingTips, setSavingTips] = useState([]);
  const [generatingTips, setGeneratingTips] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  useEffect(() => {
    fetchGoals();
  }, []);
  
  const fetchGoals = async () => {
    try {
      setLoading(true);
      const data = await getSavingsGoals();
      if (data && Array.isArray(data)) {
        setGoals(data);
        console.log(`Fetched ${data.length} savings goals`);
      } else {
        console.log('No savings goals found or invalid response format');
        setGoals([]);
      }
    } catch (error) {
      console.error('Error fetching savings goals:', error);
      Alert.alert('Error', 'Failed to load savings goals');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddGoal = async () => {
    if (!name || !targetAmount) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const goalData = {
        name,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount || '0'),
        deadline: deadline.toISOString().split('T')[0]
      };
      
      console.log('Creating goal with data:', goalData);
      const newGoal = await createSavingsGoal(goalData);
      
      if (!newGoal) {
        throw new Error('Failed to create goal - no data returned');
      }
      
      console.log('Goal created successfully:', newGoal);
      
      // Reset form
      setName('');
      setTargetAmount('');
      setCurrentAmount('0');
      setDeadline(new Date());
      setShowAddGoal(false);
      
      // Reload goals
      await fetchGoals();
      
      Alert.alert('Success', 'Savings goal created successfully!');
    } catch (error) {
      console.error('Error creating savings goal:', error);
      Alert.alert('Error', 'Failed to create savings goal');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleUpdateAmount = async (goalId, newAmount) => {
    try {
      setUpdating(true);
      console.log(`Updating goal ${goalId} amount to: ${newAmount}`);
      
      const result = await updateSavingsGoal(goalId, { 
        current_amount: parseFloat(newAmount) 
      });
      
      if (result) {
        console.log('Goal updated successfully:', result);
      }
      
      // Reload goals to refresh data
      await fetchGoals();
    } catch (error) {
      console.error('Error updating savings goal amount:', error);
      Alert.alert('Error', 'Failed to update amount');
    } finally {
      setUpdating(false);
    }
  };
  
  const handleDeleteGoal = (goalId) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this savings goal?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`Deleting goal with ID: ${goalId}`);
              
              // Delete goal using Supabase
              const { error } = await supabase
                .from('savings_goals')
                .delete()
                .eq('id', goalId);
              
              if (error) throw error;
              
              console.log('Goal deleted successfully');
              
              // Update local state
              setGoals(goals.filter(goal => goal.id !== goalId));
              
              // Refresh list from database
              await fetchGoals();
            } catch (error) {
              console.error('Error deleting savings goal:', error);
              Alert.alert('Error', 'Failed to delete savings goal');
            }
          }
        }
      ]
    );
  };
  
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || deadline;
    setShowDatePicker(Platform.OS === 'ios');
    setDeadline(currentDate);
  };
  
  const showDatepicker = () => {
    setShowDatePicker(true);
  };
  
  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };
  
  const getTimeRemaining = (deadlineDate) => {
    const today = new Date();
    const targetDate = new Date(deadlineDate);
    
    // Calculate difference in days
    const diffTime = targetDate.getTime() - today.getTime();
    
    if (diffTime <= 0) {
      return 'Deadline passed';
    }
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) {
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''} left`;
    }
    
    return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
  };
  
  const calculateDailyAmount = (goal) => {
    const today = new Date();
    const targetDate = new Date(goal.deadline);
    
    // Calculate difference in days
    const diffTime = targetDate.getTime() - today.getTime();
    
    if (diffTime <= 0) {
      return 0;
    }
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const remainingAmount = goal.target_amount - goal.current_amount;
    
    if (remainingAmount <= 0) {
      return 0;
    }
    
    return (remainingAmount / diffDays).toFixed(2);
  };
  
  const handleGenerateSavingTips = async () => {
    try {
      setGeneratingTips(true);
      
      // Fetch necessary data
      const [expenses, budgets, savingsGoalsData] = await Promise.all([
        getExpenses({ limit: 100 }), // Get last 100 expenses
        [], // Placeholder for budgets
        getSavingsGoals()
      ]);
      
      console.log(`Fetched ${expenses.length} expenses for generating tips`);
      
      // Call AI service
      const result = await generateSavingsRecommendations(expenses, budgets, savingsGoalsData);
      
      if (result.success && result.data) {
        setSavingTips(result.data.recommendations || []);
        console.log(`Generated ${result.data.recommendations.length} saving tips`);
      } else {
        throw new Error(result.error || 'Failed to generate tips');
      }
    } catch (error) {
      console.error('Error generating saving tips:', error);
      Alert.alert('Error', 'Failed to generate saving tips');
    } finally {
      setGeneratingTips(false);
    }
  };
  
  // Format currency helper
  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };
  
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-accent-100 justify-center items-center">
        <ActivityIndicator size="large" color="#0061FF" />
        <Text className="font-rubik mt-4">Loading your savings goals...</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView className="flex-1 bg-accent-100">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 flex-row justify-between items-center">
          <View>
            <Text className="font-rubik-medium text-black-300 text-xl">Savings Goals</Text>
            <Text className="font-rubik text-black-100">Track your progress towards financial goals</Text>
          </View>
          <TouchableOpacity 
            className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center"
            onPress={() => setShowAddGoal(!showAddGoal)}
          >
            <Ionicons name={showAddGoal ? "close" : "add"} size={20} color="#0061FF" />
          </TouchableOpacity>
        </View>
        
        {/* Add Goal Form */}
        {showAddGoal && (
          <View className="mx-4 bg-white p-4 rounded-2xl shadow-sm mb-4">
            <Text className="font-rubik-medium text-black-300 text-lg mb-4">New Savings Goal</Text>
            
            <View className="mb-4">
              <Text className="font-rubik text-black-100 mb-2">Goal Name</Text>
              <TextInput
                className="bg-accent-100 p-3 rounded-xl font-rubik text-black-300"
                placeholder="e.g. New Laptop, Vacation"
                value={name}
                onChangeText={setName}
              />
            </View>
            
            <View className="mb-4">
              <Text className="font-rubik text-black-100 mb-2">Target Amount</Text>
              <View className="flex-row items-center bg-accent-100 p-3 rounded-xl">
                <Text className="font-rubik text-black-300 mr-2">₹</Text>
                <TextInput
                  className="font-rubik text-black-300 flex-1"
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                />
              </View>
            </View>
            
            <View className="mb-4">
              <Text className="font-rubik text-black-100 mb-2">Current Amount (Optional)</Text>
              <View className="flex-row items-center bg-accent-100 p-3 rounded-xl">
                <Text className="font-rubik text-black-300 mr-2">₹</Text>
                <TextInput
                  className="font-rubik text-black-300 flex-1"
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={currentAmount}
                  onChangeText={setCurrentAmount}
                />
              </View>
            </View>
            
            <View className="mb-4">
              <Text className="font-rubik text-black-100 mb-2">Target Date</Text>
              <TouchableOpacity 
                onPress={showDatepicker}
                className="bg-accent-100 p-3 rounded-xl flex-row items-center justify-between"
              >
                <Text className="font-rubik text-black-300">
                  {deadline.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#8C8E98" />
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={deadline}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>
            
            <TouchableOpacity 
              className="bg-primary-300 p-3 rounded-xl"
              onPress={handleAddGoal}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="font-rubik-medium text-white text-center">Create Goal</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {/* Goals List */}
        <View className="mx-4 mb-4">
          {goals.length > 0 ? (
            goals.map((goal) => (
              <View key={goal.id} className="bg-white p-4 rounded-2xl shadow-sm mb-3">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-rubik-medium text-black-300 text-lg">{goal.name}</Text>
                  <TouchableOpacity 
                    onPress={() => handleDeleteGoal(goal.id)}
                    className="w-8 h-8 bg-accent-100 rounded-full items-center justify-center"
                  >
                    <Ionicons name="trash-outline" size={16} color="#F75555" />
                  </TouchableOpacity>
                </View>
                
                <View className="mb-2">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="font-rubik text-black-100">Target: ${goal.target_amount.toFixed(2)}</Text>
                    <Text className="font-rubik text-primary-300">{getTimeRemaining(goal.deadline)}</Text>
                  </View>
                  
                  <View className="h-3 bg-primary-100 rounded-full w-full mb-1">
                    <View 
                      className="h-3 bg-primary-300 rounded-full" 
                      style={{ width: `${calculateProgress(goal.current_amount, goal.target_amount)}%` }} 
                    />
                  </View>
                  
                  <View className="flex-row justify-between">
                    <Text className="font-rubik text-black-100">
                      ${goal.current_amount.toFixed(2)} saved
                    </Text>
                    <Text className="font-rubik-medium text-black-300">
                      {Math.round(calculateProgress(goal.current_amount, goal.target_amount))}%
                    </Text>
                  </View>
                </View>
                
                <View className="mt-3 pt-3 border-t border-accent-100">
                  <Text className="font-rubik text-black-100 mb-2">
                    Save ${calculateDailyAmount(goal)} daily to reach your goal
                  </Text>
                  
                  <View className="mb-4">
                    <Text className="font-rubik text-black-100 mb-1">Update Current Amount</Text>
                    <View className="flex-row items-center">
                      <Slider
                        style={{flex: 1, height: 40, marginRight: 8}}
                        minimumValue={0}
                        maximumValue={goal.target_amount}
                        step={10}
                        value={goal.current_amount}
                        onValueChange={(value) => {
                          // Update locally before saving to database
                          const updatedGoals = goals.map(g => {
                            if (g.id === goal.id) {
                              return { ...g, current_amount: value };
                            }
                            return g;
                          });
                          setGoals(updatedGoals);
                        }}
                        onSlidingComplete={(value) => handleUpdateAmount(goal.id, value)}
                        minimumTrackTintColor="#0061FF"
                        maximumTrackTintColor="#E0E0E0"
                        thumbTintColor="#0061FF"
                      />
                      <Text className="font-rubik-medium text-black-300 w-16 text-right">
                        ${Math.round(goal.current_amount)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View className="bg-white p-6 rounded-2xl shadow-sm items-center">
              <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="wallet-outline" size={32} color="#0061FF" />
              </View>
              <Text className="font-rubik-medium text-black-300 text-lg mb-2">No Savings Goals Yet</Text>
              <Text className="font-rubik text-black-100 text-center mb-4">
                Create a savings goal to track your progress towards financial targets
              </Text>
              <TouchableOpacity 
                className="bg-primary-300 px-4 py-2 rounded-xl"
                onPress={() => setShowAddGoal(true)}
              >
                <Text className="font-rubik-medium text-white">Create Your First Goal</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Savings Tips */}
        <View className="mx-4 mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-rubik-medium text-black-300 text-lg">Savings Tips</Text>
            <TouchableOpacity 
              onPress={handleGenerateSavingTips}
              disabled={generatingTips}
            >
              {generatingTips ? (
                <ActivityIndicator size="small" color="#0061FF" />
              ) : (
                <Text className="font-rubik-medium text-primary-300">Generate Tips</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {savingTips.length > 0 ? (
            savingTips.map((tip, index) => (
              <View key={index} className="bg-white p-4 rounded-2xl shadow-sm mb-3">
                <View className="flex-row mb-2">
                  <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
                    <Ionicons name="bulb-outline" size={20} color="#0061FF" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-rubik-medium text-black-300 mb-1">{tip.title || 'Saving Tip'}</Text>
                    <Text className="font-rubik text-black-100">{tip.description}</Text>
                  </View>
                </View>
                
                {tip.potentialSavings && (
                  <View className="mt-2 bg-green-100 p-2 rounded-lg">
                    <Text className="font-rubik-medium text-green-700 text-center">
                      Potential Savings: ${tip.potentialSavings.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View className="bg-primary-100 p-4 rounded-2xl shadow-sm mb-3">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-primary-200 items-center justify-center mr-3">
                  <Ionicons name="bulb" size={20} color="#0061FF" />
                </View>
                <View className="flex-1">
                  <Text className="font-rubik-medium text-black-300 mb-1">Saving Tip</Text>
                  <Text className="font-rubik text-black-200">
                    Try the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings and debt repayment.
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}