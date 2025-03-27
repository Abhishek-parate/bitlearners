// app/(root)/(tabs)/budget/insights.tsx
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
import { useAuth } from '@/contexts/AuthProvider';

// Import Supabase and AI functions
import { 
  getBudgets, 
  getExpenses, 
  getBudgetInsights,
  createBudgetInsight,
  // Add this import to fix the supabase reference error
  supabase
} from '@/lib/supabase';
import { generateBudgetInsights } from '@/lib/budget-ai';

export default function BudgetInsightsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);
  
  useEffect(() => {
    fetchInitialData();
  }, []);
  
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch budgets
      const budgetsData = await getBudgets();
      setBudgets(budgetsData || []);
      
      // Set selected budget to most recent active one
      if (budgetsData && budgetsData.length > 0) {
        const now = new Date();
        const activeBudgets = budgetsData.filter(b => {
          const start = new Date(b.start_date);
          const end = new Date(b.end_date);
          return start <= now && end >= now;
        });
        
        if (activeBudgets.length > 0) {
          setSelectedBudget(activeBudgets[0]);
        } else {
          // Fallback to most recent budget
          const sortedBudgets = [...budgetsData].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setSelectedBudget(sortedBudgets[0]);
        }
      }
      
      // Fetch existing insights
      const insightsData = await getBudgetInsights();
      setInsights(insightsData || []);
      
    } catch (error) {
      console.error('Error fetching insights data:', error);
      Alert.alert('Error', 'Failed to load budget insights');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGenerateInsights = async () => {
    try {
      setGenerating(true);
      
      if (!user) {
        Alert.alert('Error', 'User not found');
        return;
      }
      
      // Generate insights using AI service
      const newInsights = await generateBudgetInsights(
        user.id, 
        selectedBudget ? selectedBudget.id : undefined
      );
      
      if (!newInsights || newInsights.length === 0) {
        Alert.alert('No Insights', 'Not enough data to generate budget insights');
        return;
      }
      
      // Save insights to database
      const savePromises = newInsights.map(insight => createBudgetInsight(insight));
      await Promise.all(savePromises);
      
      // Refresh insights
      const updatedInsights = await getBudgetInsights();
      setInsights(updatedInsights || []);
      
      Alert.alert('Success', 'New budget insights generated');
    } catch (error) {
      console.error('Error generating insights:', error);
      Alert.alert('Error', 'Failed to generate budget insights');
    } finally {
      setGenerating(false);
    }
  };
  
  const selectBudget = (budget) => {
    setSelectedBudget(budget);
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Updated to use valid Ionicons names
  const getInsightIcon = (type) => {
    switch (type) {
      case 'savings_opportunity':
        return { name: 'flash-outline', color: '#4CAF50' };
      case 'spending_pattern':
        return { name: 'analytics-outline', color: '#FF9800' };
      case 'recommendation':
        return { name: 'bulb-outline', color: '#0061FF' };
      default:
        return { name: 'information-circle-outline', color: '#8C8E98' };
    }
  };
  
  // Function to mark insight as applied
  const markInsightAsApplied = async (insightId) => {
    try {
      const { error } = await supabase
        .from('budget_insights')
        .update({ applied: true })
        .eq('id', insightId);
        
      if (error) {
        console.error('Error marking insight as applied:', error);
        return;
      }
      
      // Update local state
      const updatedInsights = [...insights];
      const index = updatedInsights.findIndex(i => i.id === insightId);
      if (index !== -1) {
        updatedInsights[index].applied = true;
        setInsights(updatedInsights);
      }
    } catch (error) {
      console.error('Error updating insight:', error);
    }
  };
  
  return (
    <SafeAreaView className="flex-1 bg-accent-100">
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#191D31" />
          </TouchableOpacity>
          <Text className="font-rubik-semibold text-black-300 text-xl">Budget Insights</Text>
        </View>
        
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#0061FF" />
          </View>
        ) : (
          <ScrollView className="flex-1">
            {/* Budget Selector */}
            <View className="mx-4 mb-4">
              <Text className="font-rubik-medium text-black-300 mb-2">Select Budget</Text>
              <ScrollView 
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 20 }}
              >
                <TouchableOpacity
                  className={`p-3 rounded-xl mr-2 ${!selectedBudget ? 'bg-primary-300' : 'bg-white'}`}
                  onPress={() => selectBudget(null)}
                >
                  <Text 
                    className={`font-rubik-medium ${!selectedBudget ? 'text-white' : 'text-black-200'}`}
                  >
                    All Budgets
                  </Text>
                </TouchableOpacity>
                
                {budgets.map(budget => (
                  <TouchableOpacity
                    key={budget.id}
                    className={`p-3 rounded-xl mr-2 ${
                      selectedBudget?.id === budget.id ? 'bg-primary-300' : 'bg-white'
                    }`}
                    onPress={() => selectBudget(budget)}
                  >
                    <Text 
                      className={`font-rubik-medium ${
                        selectedBudget?.id === budget.id ? 'text-white' : 'text-black-200'
                      }`}
                    >
                      {budget.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            {/* Generate Button */}
            <View className="mx-4 mb-4">
              <TouchableOpacity
                className="bg-primary-300 p-4 rounded-xl flex-row items-center justify-center"
                onPress={handleGenerateInsights}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="bulb-outline" size={20} color="white" />
                    <Text className="font-rubik-medium text-white ml-2">Generate New Insights</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Insights List */}
            <View className="mx-4 mb-6">
              <Text className="font-rubik-medium text-black-300 text-lg mb-2">Your Insights</Text>
              
              {insights.length > 0 ? (
                // Filter insights by selected budget if needed
                insights
                  .filter(insight => !selectedBudget || insight.budget_id === selectedBudget.id)
                  .map((insight, index) => {
                    const icon = getInsightIcon(insight.insight_type);
                    
                    return (
                      <View key={insight.id} className="bg-white p-4 rounded-2xl mb-3">
                        <View className="flex-row">
                          <View 
                            className="w-10 h-10 rounded-full items-center justify-center mr-3"
                            style={{ backgroundColor: `${icon.color}20` }}
                          >
                            <Ionicons name={icon.name} size={20} color={icon.color} />
                          </View>
                          
                          <View className="flex-1">
                            <View className="flex-row justify-between items-center mb-1">
                              <Text className="font-rubik-medium text-black-300 capitalize">
                                {insight.insight_type.replace('_', ' ')}
                              </Text>
                              <Text className="font-rubik text-black-100 text-xs">
                                {formatDate(insight.created_at)}
                              </Text>
                            </View>
                            
                            <Text className="font-rubik text-black-200">
                              {insight.description}
                            </Text>
                            
                            {insight.applied ? (
                              <View className="flex-row items-center mt-2">
                                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                                <Text className="font-rubik text-green-500 text-xs ml-1">Applied</Text>
                              </View>
                            ) : (
                              <TouchableOpacity 
                                className="bg-accent-100 px-3 py-1 rounded-lg self-start mt-2"
                                onPress={() => markInsightAsApplied(insight.id)}
                              >
                                <Text className="font-rubik text-primary-300 text-xs">Apply This Insight</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })
              ) : (
                <View className="bg-white p-6 rounded-2xl items-center justify-center">
                  <Ionicons name="bulb-outline" size={40} color="#8C8E98" />
                  <Text className="font-rubik-medium text-black-200 mt-2 mb-1">No insights yet</Text>
                  <Text className="font-rubik text-black-100 text-center mb-4">
                    Generate insights to get personalized recommendations for your budget.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}