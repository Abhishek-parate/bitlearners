// app/(root)/expense/index.tsx
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
import { router } from 'expo-router';
import { useAuth } from '../../../contexts/AuthProvider';
import { supabase } from '../../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

// Icon mapping for categories
const categoryIconMap: Record<string, string> = {
  'Food': 'fast-food-outline',
  'Transport': 'bus-outline',
  'Housing': 'home-outline',
  'Education': 'book-outline',
  'Entertainment': 'film-outline',
  'Shopping': 'cart-outline',
  'Health': 'medical-outline',
  'Miscellaneous': 'grid-outline'
};

type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
};

type Budget = {
  id: string;
  name: string;
  amount: number;
  period: string;
};

const AddExpensePage = () => {
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [note, setNote] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);

  // Listen for keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Fetch categories and budgets from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name');
        
        if (categoriesError) throw categoriesError;
        
        const formattedCategories = categoriesData?.map(cat => ({
          ...cat,
          icon: categoryIconMap[cat.name] || 'grid-outline'
        })) || [];
        
        setCategories(formattedCategories);
        
        // Fetch active budgets
        const today = new Date().toISOString().split('T')[0];
        const { data: budgetsData, error: budgetsError } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user?.id)
          .lte('start_date', today)
          .or(`end_date.gte.${today},end_date.is.null`)
          .order('created_at', { ascending: false });
        
        if (budgetsError) throw budgetsError;
        
        setBudgets(budgetsData || []);
        
        // Set default budget if available
        if (budgetsData && budgetsData.length > 0) {
          setSelectedBudget(budgetsData[0].id);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load categories and budgets');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchData();
    }
  }, [user]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const handleSaveExpense = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!description) {
      Alert.alert('Error', 'Please provide a description');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    try {
      setSaveLoading(true);
      
      // Insert new expense
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: user?.id,
          category_id: selectedCategory,
          budget_id: selectedBudget,
          amount: parseFloat(amount),
          description,
          date: date.toISOString().split('T')[0],
          location: '',
          receipt_url: '',
          is_recurring: false
        })
        .select()
        .single();

      if (error) throw error;
      
      Alert.alert(
        'Success',
        'Expense added successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error: any) {
      console.error('Error saving expense:', error);
      Alert.alert('Error', error.message || 'Failed to save expense');
    } finally {
      setSaveLoading(false);
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return `${amount.toFixed(2)}`;
  };
  
  // Helper function to format date
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Helper function to scroll to a specific input
  const scrollToInput = (yPosition: number) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: yPosition,
        animated: true,
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-accent-100 justify-center items-center">
        <ActivityIndicator size="large" color="#0061FF" />
        <Text className="font-rubik text-black-200 mt-4">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-accent-100">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1">
          {/* Header */}
          <View className="px-4 py-4 flex-row items-center">
            <TouchableOpacity 
              className="mr-4"
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#191D31" />
            </TouchableOpacity>
            <Text className="font-rubik-semibold text-black-300 text-xl">Add Expense</Text>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {/* Amount Input */}
            <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
              <Text className="font-rubik text-black-100 mb-2">Amount</Text>
              <View className="flex-row items-center">
                <Text className="font-rubik-medium text-black-300 text-xl mr-2">$</Text>
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

            {/* Budget Selection */}
            <View className="mx-4 mb-4">
              <Text className="font-rubik text-black-100 mb-2">Budget</Text>
              <View className="flex-row flex-wrap">
                {budgets.length > 0 ? (
                  budgets.map((budget) => (
                    <TouchableOpacity
                      key={budget.id}
                      className={`mr-2 mb-2 p-3 rounded-xl flex-row items-center ${
                        selectedBudget === budget.id ? 'bg-primary-200' : 'bg-white'
                      }`}
                      onPress={() => setSelectedBudget(budget.id)}
                    >
                      <View className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center mr-2">
                        <Ionicons 
                          name="wallet-outline" 
                          size={16} 
                          color="#0061FF" 
                        />
                      </View>
                      <View>
                        <Text 
                          className={`font-rubik ${
                            selectedBudget === budget.id ? 'text-primary-300 font-rubik-medium' : 'text-black-200'
                          }`}
                        >
                          {budget.name}
                        </Text>
                        <Text className="font-rubik text-black-100 text-xs">
                          {formatCurrency(budget.amount)} • {budget.period}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <TouchableOpacity
                    className="bg-white p-4 rounded-xl w-full items-center"
                    onPress={() => router.push('/budget/view')}
                  >
                    <Text className="font-rubik-medium text-primary-300">Create a Budget</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Category Selection */}
            <View className="mx-4 mb-4">
              <Text className="font-rubik text-black-100 mb-2">Category</Text>
              <View className="flex-row flex-wrap">
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    className={`mr-2 mb-2 p-3 rounded-xl flex-row items-center ${
                      selectedCategory === cat.id ? 'bg-primary-200' : 'bg-white'
                    }`}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <View 
                      className="w-8 h-8 rounded-full items-center justify-center mr-2"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      <Ionicons 
                        name={cat.icon} 
                        size={16} 
                        color={cat.color} 
                      />
                    </View>
                    <Text 
                      className={`font-rubik ${
                        selectedCategory === cat.id ? 'text-primary-300 font-rubik-medium' : 'text-black-200'
                      }`}
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
                  {formatDate(date)}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#8C8E98" />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  maximumDate={new Date()}
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
                onFocus={() => scrollToInput(600)}
              />
            </View>

            {/* Save Button */}
            <View className="mx-4 mb-6">
              <TouchableOpacity 
                className="bg-primary-300 p-4 rounded-xl"
                onPress={handleSaveExpense}
                disabled={saveLoading}
              >
                {saveLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="font-rubik-medium text-white text-center">Save Expense</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddExpensePage;