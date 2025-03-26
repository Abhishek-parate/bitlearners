// app/expense/[id].tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase, getCategories } from '@/lib/supabase';

export default function ExpenseDetailPage() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState(null);
  const [category, setCategory] = useState(null);
  
  useEffect(() => {
    fetchExpenseDetails();
  }, [id]);
  
  const fetchExpenseDetails = async () => {
    try {
      setLoading(true);
      
      if (!id) {
        throw new Error('No expense ID provided');
      }
      
      // Fetch expense
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single();
        
      if (expenseError) throw expenseError;
      if (!expenseData) throw new Error('Expense not found');
      
      setExpense(expenseData);
      
      // Fetch category data
      if (expenseData.category_id) {
        const categoriesData = await getCategories();
        const foundCategory = categoriesData.find(cat => cat.id === expenseData.category_id);
        if (foundCategory) {
          setCategory(foundCategory);
        }
      }
    } catch (error) {
      console.error('Error fetching expense details:', error);
      Alert.alert('Error', 'Failed to load expense details');
      router.back();
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = () => {
    Alert.alert(
      'Delete Expense', 
      'Are you sure you want to delete this expense?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete
        }
      ]
    );
  };
  
  const confirmDelete = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      Alert.alert('Success', 'Expense deleted successfully');
      router.back();
    } catch (error) {
      console.error('Error deleting expense:', error);
      Alert.alert('Error', 'Failed to delete expense');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = () => {
    router.push({ pathname: '/expense/edit/[id]', params: { id } });
  };
  
  const handleShare = async () => {
    try {
      const categoryName = category?.name || 'Uncategorized';
      const dateStr = new Date(expense.date).toLocaleDateString();
      
      await Share.share({
        message: `Expense: ${expense.description}\nAmount: ${parseFloat(expense.amount).toFixed(2)}\nCategory: ${categoryName}\nDate: ${dateStr}${expense.note ? `\nNote: ${expense.note}` : ''}`
      });
    } catch (error) {
      console.error('Error sharing expense:', error);
    }
  };
  
  const getCategoryIcon = (categoryName = '') => {
    const categoryIcons = {
      'Food': 'fast-food-outline',
      'Transport': 'bus-outline',
      'Housing': 'home-outline',
      'Education': 'book-outline',
      'Entertainment': 'film-outline',
      'Shopping': 'cart-outline',
      'Health': 'fitness-outline',
      'Miscellaneous': 'albums-outline'
    };
    
    return categoryIcons[categoryName] || 'albums-outline';
  };
  
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-accent-100 justify-center items-center">
        <ActivityIndicator size="large" color="#0061FF" />
        <Text className="font-rubik mt-4">Loading expense details...</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView className="flex-1 bg-accent-100">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="#191D31" />
            </TouchableOpacity>
            <Text className="font-rubik-semibold text-black-300 text-xl">Expense Details</Text>
          </View>
          <View className="flex-row">
            <TouchableOpacity onPress={handleShare} className="mr-4">
              <Ionicons name="share-outline" size={24} color="#191D31" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={24} color="#F75555" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Amount Card */}
        <View className="mx-4 p-6 bg-white rounded-2xl shadow-sm mb-4 items-center">
          <Text className="font-rubik text-black-100 mb-2">Amount</Text>
          <Text className="font-rubik-bold text-danger text-4xl">-${parseFloat(expense.amount).toFixed(2)}</Text>
        </View>
        
        {/* Details */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <Text className="font-rubik-medium text-black-300 text-lg mb-3">Details</Text>
          
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-rubik text-black-100">Description</Text>
            <Text className="font-rubik-medium text-black-300">{expense.description}</Text>
          </View>
          
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-rubik text-black-100">Category</Text>
            <View className="flex-row items-center">
              {category && (
                <View 
                  className="w-8 h-8 rounded-full items-center justify-center mr-2"
                  style={{ backgroundColor: `${category.color || '#0061FF'}20` }}
                >
                  <Ionicons 
                    name={getCategoryIcon(category.name)} 
                    size={16} 
                    color={category.color || '#0061FF'} 
                  />
                </View>
              )}
              <Text className="font-rubik-medium text-black-300">{category?.name || 'Uncategorized'}</Text>
            </View>
          </View>
          
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-rubik text-black-100">Date</Text>
            <Text className="font-rubik-medium text-black-300">
              {new Date(expense.date).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </Text>
          </View>
          
          {expense.is_recurring && (
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-rubik text-black-100">Recurring</Text>
              <Text className="font-rubik-medium text-black-300">Yes</Text>
            </View>
          )}
          
          {expense.note && (
            <View className="mb-2">
              <Text className="font-rubik text-black-100 mb-1">Note</Text>
              <View className="bg-accent-100 p-3 rounded-xl mt-1">
                <Text className="font-rubik text-black-200">{expense.note}</Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Location */}
        {expense.location && (
          <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
            <Text className="font-rubik-medium text-black-300 text-lg mb-3">Location</Text>
            <Text className="font-rubik text-black-200">{expense.location}</Text>
          </View>
        )}
        
        {/* Edit Button */}
        <View className="mx-4 mb-6">
          <TouchableOpacity 
            className="bg-primary-300 p-4 rounded-xl"
            onPress={handleEdit}
          >
            <Text className="font-rubik-medium text-white text-center">Edit Expense</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
