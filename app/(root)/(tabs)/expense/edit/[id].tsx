// app/expense/edit/[id].tsx
import React, { useState, useEffect, useRef } from 'react';
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
  Keyboard,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import Supabase functions
import { supabase, getCategories } from '@/lib/supabase';

export default function EditExpensePage() {
  const { id } = useLocalSearchParams();
  const scrollViewRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expense, setExpense] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState([]);
  
  // Default bottom tab height - adjust this value based on your actual tab height
  const TAB_BAR_HEIGHT = 60;

  useEffect(() => {
    fetchExpenseData();
  }, [id]);
  
  const fetchExpenseData = async () => {
    try {
      setLoading(true);
      
      // Fetch expense data
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single();
        
      if (expenseError) throw expenseError;
      if (!expenseData) throw new Error('Expense not found');
      
      // Fetch categories
      const categoriesData = await getCategories();
      if (!categoriesData) throw new Error('Failed to fetch categories');
      
      // Set data
      setExpense(expenseData);
      setAmount(expenseData.amount.toString());
      setDescription(expenseData.description || '');
      setCategoryId(expenseData.category_id || '');
      setDate(new Date(expenseData.date));
      setNote(expenseData.note || '');
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching expense data:', error);
      Alert.alert('Error', 'Failed to load expense data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const handleUpdateExpense = async () => {
    if (!amount || !description || !categoryId) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const updatedExpense = {
        amount: parseFloat(amount),
        description,
        category_id: categoryId,
        date: date.toISOString().split('T')[0],
        note: note || null
      };
      
      const { error } = await supabase
        .from('expenses')
        .update(updatedExpense)
        .eq('id', id);
      
      if (error) throw error;
      
      Alert.alert('Success', 'Expense updated successfully', [
        { 
          text: 'OK', 
          onPress: () => router.back()
        }
      ]);
    } catch (error) {
      console.error('Error updating expense:', error);
      Alert.alert('Error', 'Failed to update expense');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to scroll to a specific input
  const scrollToInput = (yPosition) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: yPosition,
        animated: true,
      });
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  // Calculate bottom padding to ensure content is visible above tab bar
  const getBottomPadding = () => {
    const safeAreaBottom = insets.bottom > 0 ? insets.bottom : 0;
    return TAB_BAR_HEIGHT + safeAreaBottom + 20; // 20px extra padding for comfort
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#0061FF';
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-accent-100 justify-center items-center">
        <ActivityIndicator size="large" color="#0061FF" />
        <Text className="font-rubik mt-4">Loading expense data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-accent-100" style={{ paddingBottom: 0 }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? TAB_BAR_HEIGHT : 0}
      >
        <View className="flex-1">
          {/* Header */}
          <View className="px-4 py-4 flex-row items-center">
            <TouchableOpacity onPress={handleGoBack} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="#191D31" />
            </TouchableOpacity>
            <Text className="font-rubik-semibold text-black-300 text-xl">Edit Expense</Text>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ 
              paddingBottom: getBottomPadding()
            }}
          >
            {/* Amount Input */}
            <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
              <Text className="font-rubik text-black-100 mb-2">Amount</Text>
              <View className="flex-row items-center">
                <Text className="font-rubik-medium text-black-300 text-xl mr-2">₹</Text>
                <TextInput
                  className="font-rubik-semibold text-black-300 text-3xl flex-1"
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                  onFocus={() => scrollToInput(0)}
                />
              </View>
            </View>

            {/* Description Input */}
            <View className="mx-4 mb-4">
              <Text className="font-rubik text-black-100 mb-2">Description</Text>
              <TextInput
                className="bg-white p-4 rounded-2xl font-rubik text-black-300"
                placeholder="What did you spend on?"
                value={description}
                onChangeText={setDescription}
                onFocus={() => scrollToInput(100)}
              />
            </View>

            {/* Category Selection */}
            <View className="mx-4 mb-4">
              <Text className="font-rubik text-black-100 mb-2">Category</Text>
              <View className="flex-row flex-wrap">
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    className={`mr-2 mb-2 p-3 rounded-xl flex-row items-center ${categoryId === cat.id ? 'bg-primary-200' : 'bg-white'}`}
                    onPress={() => setCategoryId(cat.id)}
                  >
                    <View 
                      className="w-8 h-8 rounded-full items-center justify-center mr-2"
                      style={{ backgroundColor: `${cat.color || '#0061FF'}20` }}
                    >
                      <Ionicons name={cat.icon || 'grid-outline'} size={16} color={cat.color || '#0061FF'} />
                    </View>
                    <Text 
                      className={`font-rubik ${categoryId === cat.id ? 'text-primary-300 font-rubik-medium' : 'text-black-200'}`}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Selection */}
            <View className="mx-4 mb-4">
              <Text className="font-rubik text-black-100 mb-2">Date</Text>
              <TouchableOpacity 
                onPress={showDatepicker}
                className="bg-white p-4 rounded-2xl flex-row items-center justify-between"
              >
                <Text className="font-rubik text-black-300">
                  {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#8C8E98" />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}
            </View>

            {/* Note Input */}
            <View className="mx-4 mb-6">
              <Text className="font-rubik text-black-100 mb-2">Note (Optional)</Text>
              <TextInput
                className="bg-white p-4 rounded-2xl font-rubik text-black-300 h-24"
                placeholder="Add note"
                multiline
                textAlignVertical="top"
                value={note}
                onChangeText={setNote}
                onFocus={() => scrollToInput(400)}
              />
            </View>

            {/* Save Button */}
            <View className="mx-4 mb-6">
              <TouchableOpacity 
                className="bg-primary-300 p-4 rounded-xl"
                onPress={handleUpdateExpense}
                disabled={submitting}
              >
                {submitting ? (
                  <Text className="font-rubik-medium text-white text-center">Updating...</Text>
                ) : (
                  <Text className="font-rubik-medium text-white text-center">Update Expense</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
