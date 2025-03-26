
// app/income/edit/[id].tsx
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
  Switch,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import Supabase functions
import { supabase } from '@/lib/supabase';

export default function EditIncomePage() {
  const { id } = useLocalSearchParams();
  const scrollViewRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [income, setIncome] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly'); // weekly, monthly, annually
  
  // Default bottom tab height - adjust this value based on your actual tab height
  const TAB_BAR_HEIGHT = 60;

  useEffect(() => {
    fetchIncomeData();
  }, [id]);
  
  const fetchIncomeData = async () => {
    try {
      setLoading(true);
      
      // Fetch income data
      const { data: incomeData, error: incomeError } = await supabase
        .from('income')
        .select('*')
        .eq('id', id)
        .single();
        
      if (incomeError) throw incomeError;
      if (!incomeData) throw new Error('Income not found');
      
      // Set data
      setIncome(incomeData);
      setAmount(incomeData.amount.toString());
      setDescription(incomeData.description || '');
      setDate(new Date(incomeData.date));
      setNote(incomeData.note || '');
      setIsRecurring(incomeData.is_recurring || false);
      setFrequency(incomeData.frequency || 'monthly');
    } catch (error) {
      console.error('Error fetching income data:', error);
      Alert.alert('Error', 'Failed to load income data');
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

  const handleUpdateIncome = async () => {
    if (!amount || !description) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const updatedIncome = {
        amount: parseFloat(amount),
        description,
        date: date.toISOString().split('T')[0],
        is_recurring: isRecurring,
        frequency: isRecurring ? frequency : null,
        note: note || null
      };
      
      const { error } = await supabase
        .from('income')
        .update(updatedIncome)
        .eq('id', id);
      
      if (error) throw error;
      
      Alert.alert('Success', 'Income updated successfully', [
        { 
          text: 'OK', 
          onPress: () => router.back()
        }
      ]);
    } catch (error) {
      console.error('Error updating income:', error);
      Alert.alert('Error', 'Failed to update income');
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-accent-100 justify-center items-center">
        <ActivityIndicator size="large" color="#0061FF" />
        <Text className="font-rubik mt-4">Loading income data...</Text>
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
            <Text className="font-rubik-semibold text-black-300 text-xl">Edit Income</Text>
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
                <Text className="font-rubik-medium text-green-700 text-xl mr-2">$</Text>
                <TextInput
                  className="font-rubik-semibold text-green-700 text-3xl flex-1"
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
                placeholder="Income source (e.g. Salary, Freelancing)"
                value={description}
                onChangeText={setDescription}
                onFocus={() => scrollToInput(100)}
              />
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

            {/* Recurring Toggle */}
            <View className="mx-4 mb-4 bg-white p-4 rounded-2xl">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-rubik text-black-300">Recurring Income</Text>
                <Switch
                  trackColor={{ false: "#E0E0E0", true: "#0061FF40" }}
                  thumbColor={isRecurring ? "#0061FF" : "#FFFFFF"}
                  onValueChange={() => setIsRecurring(!isRecurring)}
                  value={isRecurring}
                />
              </View>
              
              {isRecurring && (
                <View className="mt-3 pt-3 border-t border-accent-100">
                  <Text className="font-rubik text-black-100 mb-2">Frequency</Text>
                  <View className="flex-row">
                    <TouchableOpacity 
                      className={`flex-1 py-2 px-3 rounded-lg mr-2 ${frequency === 'weekly' ? 'bg-primary-200' : 'bg-accent-100'}`}
                      onPress={() => setFrequency('weekly')}
                    >
                      <Text className={`text-center font-rubik ${frequency === 'weekly' ? 'text-primary-300' : 'text-black-200'}`}>
                        Weekly
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className={`flex-1 py-2 px-3 rounded-lg mr-2 ${frequency === 'monthly' ? 'bg-primary-200' : 'bg-accent-100'}`}
                      onPress={() => setFrequency('monthly')}
                    >
                      <Text className={`text-center font-rubik ${frequency === 'monthly' ? 'text-primary-300' : 'text-black-200'}`}>
                        Monthly
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className={`flex-1 py-2 px-3 rounded-lg ${frequency === 'annually' ? 'bg-primary-200' : 'bg-accent-100'}`}
                      onPress={() => setFrequency('annually')}
                    >
                      <Text className={`text-center font-rubik ${frequency === 'annually' ? 'text-primary-300' : 'text-black-200'}`}>
                        Annually
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
                className="bg-green-700 p-4 rounded-xl"
                onPress={handleUpdateIncome}
                disabled={submitting}
              >
                {submitting ? (
                  <Text className="font-rubik-medium text-white text-center">Updating...</Text>
                ) : (
                  <Text className="font-rubik-medium text-white text-center">Update Income</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}