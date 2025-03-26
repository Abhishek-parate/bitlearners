// app/income/add.tsx
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
  Animated,
  ActivityIndicator,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// Import Supabase functions
import { addIncome } from '@/lib/supabase';

export default function AddIncomePage() {
  const scrollViewRef = useRef(null);
  const insets = useSafeAreaInsets();
  
  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly'); // weekly, monthly, annually
  const [submitting, setSubmitting] = useState(false);
  
  // UI state
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [scrollYPosition, setScrollYPosition] = useState(0);
  const scrollOpacity = useRef(new Animated.Value(0)).current;
  
  // Default bottom tab height
  const TAB_BAR_HEIGHT = 60;

  // Listen for keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        // When keyboard appears, show the scroll indicator
        Animated.timing(scrollOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        // When keyboard hides, hide the scroll indicator
        Animated.timing(scrollOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const handleSaveIncome = async () => {
    if (!amount || !description) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const incomeData = {
        amount: parseFloat(amount),
        description: description,
        date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        is_recurring: isRecurring,
        frequency: isRecurring ? frequency : null,
        note: note || null
      };
      
      console.log('Saving income with data:', incomeData);
      
      // Save to Supabase
      const result = await addIncome(incomeData);
      
      if (result) {
        Alert.alert('Success', 'Income saved successfully', [
          { 
            text: 'OK', 
            onPress: () => router.back()
          }
        ]);
      } else {
        throw new Error('Failed to save income');
      }
    } catch (error) {
      console.error('Error saving income:', error);
      Alert.alert('Error', 'Failed to save income');
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
  
  // Track scroll position to implement "scroll to top" functionality
  const handleScroll = (event) => {
    const currentY = event.nativeEvent.contentOffset.y;
    setScrollYPosition(currentY);
  };

  // Function to scroll to top
  const scrollToTop = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  // Calculate bottom padding to ensure content is visible above tab bar
  const getBottomPadding = () => {
    // Use insets.bottom for devices with home indicator (iPhone X and later)
    // If insets.bottom is 0, use the default TAB_BAR_HEIGHT
    const safeAreaBottom = insets.bottom > 0 ? insets.bottom : 0;
    return TAB_BAR_HEIGHT + safeAreaBottom + 20; // 20px extra padding for comfort
  };

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
            <Text className="font-rubik-semibold text-black-300 text-xl">Add Income</Text>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            className="flex-1"
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
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
                <TouchableOpacity
                  onPress={() => setIsRecurring(!isRecurring)}
                  className={`w-12 h-6 rounded-full px-1 flex-row items-center ${isRecurring ? 'bg-green-600 justify-end' : 'bg-gray-300 justify-start'}`}
                >
                  <View className="w-4 h-4 rounded-full bg-white" />
                </TouchableOpacity>
              </View>
              
              {isRecurring && (
                <View className="mt-3 pt-3 border-t border-accent-100">
                  <Text className="font-rubik text-black-100 mb-2">Frequency</Text>
                  <View className="flex-row">
                    <TouchableOpacity 
                      className={`flex-1 py-2 px-3 rounded-lg mr-2 ${frequency === 'weekly' ? 'bg-green-100' : 'bg-accent-100'}`}
                      onPress={() => setFrequency('weekly')}
                    >
                      <Text className={`text-center font-rubik ${frequency === 'weekly' ? 'text-green-700' : 'text-black-200'}`}>
                        Weekly
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className={`flex-1 py-2 px-3 rounded-lg mr-2 ${frequency === 'monthly' ? 'bg-green-100' : 'bg-accent-100'}`}
                      onPress={() => setFrequency('monthly')}
                    >
                      <Text className={`text-center font-rubik ${frequency === 'monthly' ? 'text-green-700' : 'text-black-200'}`}>
                        Monthly
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className={`flex-1 py-2 px-3 rounded-lg ${frequency === 'annually' ? 'bg-green-100' : 'bg-accent-100'}`}
                      onPress={() => setFrequency('annually')}
                    >
                      <Text className={`text-center font-rubik ${frequency === 'annually' ? 'text-green-700' : 'text-black-200'}`}>
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
                onPress={handleSaveIncome}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="font-rubik-medium text-white text-center">Save Income</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Scroll to top button - shows when scrolled down and keyboard is not visible */}
          {scrollYPosition > 100 && !keyboardVisible && (
            <TouchableOpacity 
              className="absolute bottom-6 right-6 bg-green-700 w-12 h-12 rounded-full items-center justify-center shadow-md"
              style={{ bottom: insets.bottom > 0 ? insets.bottom + 70 : 70 }} // Position above tabs
              onPress={scrollToTop}
            >
              <Ionicons name="arrow-up" size={24} color="white" />
            </TouchableOpacity>
          )}

          {/* Scroll indicator that appears when keyboard is open */}
          <Animated.View 
            style={{
              position: 'absolute',
              right: 6,
              top: 100,
              bottom: getBottomPadding(),
              width: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(34, 197, 94, 0.3)', // Light green
              opacity: scrollOpacity,
            }}
          >
            <Animated.View 
              style={{
                position: 'absolute',
                right: 0,
                top: `${Math.min(scrollYPosition / 500 * 100, 90)}%`,
                width: 4,
                height: '10%',
                borderRadius: 2,
                backgroundColor: '#22c55e', // Green-600
              }}
            />
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}