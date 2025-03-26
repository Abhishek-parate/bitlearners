
// app/income/[id].tsx
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
import { supabase } from '@/lib/supabase';

export default function IncomeDetailPage() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState(null);
  
  useEffect(() => {
    fetchIncomeDetails();
  }, [id]);
  
  const fetchIncomeDetails = async () => {
    try {
      setLoading(true);
      
      if (!id) {
        throw new Error('No income ID provided');
      }
      
      // Fetch income record
      const { data: incomeData, error: incomeError } = await supabase
        .from('income')
        .select('*')
        .eq('id', id)
        .single();
        
      if (incomeError) throw incomeError;
      if (!incomeData) throw new Error('Income not found');
      
      setIncome(incomeData);
    } catch (error) {
      console.error('Error fetching income details:', error);
      Alert.alert('Error', 'Failed to load income details');
      router.back();
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = () => {
    Alert.alert(
      'Delete Income', 
      'Are you sure you want to delete this income record?',
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
        .from('income')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      Alert.alert('Success', 'Income record deleted successfully');
      router.back();
    } catch (error) {
      console.error('Error deleting income:', error);
      Alert.alert('Error', 'Failed to delete income record');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = () => {
    router.push({ pathname: '/income/edit/[id]', params: { id } });
  };
  
  const handleShare = async () => {
    try {
      const dateStr = new Date(income.date).toLocaleDateString();
      
      await Share.share({
        message: `Income: ${income.description}\nAmount: ${parseFloat(income.amount).toFixed(2)}\nDate: ${dateStr}${income.frequency ? `\nFrequency: ${income.frequency}` : ''}${income.note ? `\nNote: ${income.note}` : ''}`
      });
    } catch (error) {
      console.error('Error sharing income details:', error);
    }
  };
  
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-accent-100 justify-center items-center">
        <ActivityIndicator size="large" color="#0061FF" />
        <Text className="font-rubik mt-4">Loading income details...</Text>
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
            <Text className="font-rubik-semibold text-black-300 text-xl">Income Details</Text>
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
          <Text className="font-rubik-bold text-green-600 text-4xl">+${parseFloat(income.amount).toFixed(2)}</Text>
        </View>
        
        {/* Details */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <Text className="font-rubik-medium text-black-300 text-lg mb-3">Details</Text>
          
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-rubik text-black-100">Description</Text>
            <Text className="font-rubik-medium text-black-300">{income.description}</Text>
          </View>
          
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-rubik text-black-100">Date</Text>
            <Text className="font-rubik-medium text-black-300">
              {new Date(income.date).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </Text>
          </View>
          
          {income.is_recurring && (
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-rubik text-black-100">Recurring</Text>
              <Text className="font-rubik-medium text-green-600">
                Yes {income.frequency ? `(${income.frequency})` : ''}
              </Text>
            </View>
          )}
          
          {income.note && (
            <View className="mb-2">
              <Text className="font-rubik text-black-100 mb-1">Note</Text>
              <View className="bg-accent-100 p-3 rounded-xl mt-1">
                <Text className="font-rubik text-black-200">{income.note}</Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Edit Button */}
        <View className="mx-4 mb-6">
          <TouchableOpacity 
            className="bg-green-600 p-4 rounded-xl"
            onPress={handleEdit}
          >
            <Text className="font-rubik-medium text-white text-center">Edit Income</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}