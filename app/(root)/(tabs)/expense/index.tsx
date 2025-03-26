// app/(root)/(tabs)/expense/index.tsx
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
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// Import Supabase functions
import { 
  getCategories,
  createExpense,
  getBudgets,
  createCategory
} from '@/lib/supabase';

export default function AddExpensePage() {
  const scrollViewRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [budgetId, setBudgetId] = useState(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [note, setNote] = useState('');
  const [location, setLocation] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [scrollYPosition, setScrollYPosition] = useState(0);
  const scrollOpacity = useRef(new Animated.Value(0)).current;
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  
  // New Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#0061FF');
  const [newCategoryIcon, setNewCategoryIcon] = useState('grid-outline');
  const [addingCategory, setAddingCategory] = useState(false);
  
  // Available colors for new categories
  const availableColors = [
    '#0061FF', '#F75555', '#4CAF50', '#FF9800', 
    '#9C27B0', '#795548', '#009688', '#607D8B'
  ];
  
  // Available icons for new categories
  const availableIcons = [
    { name: 'fast-food-outline', label: 'Food' },
    { name: 'bus-outline', label: 'Transport' },
    { name: 'home-outline', label: 'Housing' },
    { name: 'book-outline', label: 'Education' },
    { name: 'film-outline', label: 'Entertainment' },
    { name: 'cart-outline', label: 'Shopping' },
    { name: 'fitness-outline', label: 'Health' },
    { name: 'cash-outline', label: 'Money' },
    { name: 'bed-outline', label: 'Accommodation' },
    { name: 'gift-outline', label: 'Gifts' },
    { name: 'grid-outline', label: 'Other' }
  ];
  
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories and budgets
      const [categoriesData, budgetsData] = await Promise.all([
        getCategories(),
        getBudgets()
      ]);
      
      if (categoriesData && categoriesData.length > 0) {
        setCategories(categoriesData);
        console.log('Categories loaded:', categoriesData.length);
      } else {
        console.log('No categories found or error fetching categories');
      }
      
      if (budgetsData && budgetsData.length > 0) {
        setBudgets(budgetsData);
        // Set default budget to the most recent one
        const sortedBudgets = [...budgetsData].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        if (sortedBudgets.length > 0) {
          setBudgetId(sortedBudgets[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      Alert.alert('Error', 'Failed to load categories and budgets');
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

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Missing Field', 'Please enter a category name');
      return;
    }
    
    try {
      setAddingCategory(true);
      
      const categoryData = {
        name: newCategoryName.trim(),
        color: newCategoryColor,
        icon: newCategoryIcon,
        description: `Added from Add Expense screen on ${new Date().toLocaleDateString()}`
      };
      
      const newCategory = await createCategory(categoryData);
      
      if (newCategory) {
        // Add to categories list and select it
        setCategories([...categories, newCategory]);
        setCategoryId(newCategory.id);
        
        // Close modal and reset form
        setShowCategoryModal(false);
        setNewCategoryName('');
        
        Alert.alert('Success', 'New category created successfully');
      } else {
        throw new Error('Failed to create category');
      }
    } catch (error) {
      console.error('Error creating new category:', error);
      Alert.alert('Error', 'Failed to create new category');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!amount || !description || !categoryId) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      // Format the expense data
      const expenseData = {
        amount: parseFloat(amount),
        description,
        category_id: categoryId,
        budget_id: budgetId,
        date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        is_recurring: isRecurring,
        location: location || null
        // Note is intentionally omitted since it's causing errors
      };
      
      // Create the expense
      const result = await createExpense(expenseData);
      
      if (result) {
        Alert.alert(
          'Success', 
          'Expense saved successfully',
          [
            { 
              text: 'OK', 
              onPress: () => router.replace('/(root)/(tabs)')
            }
          ]
        );
      } else {
        throw new Error('Failed to save expense');
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      Alert.alert('Error', 'Failed to save expense');
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
    router.replace('/(root)/(tabs)');
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

  // Calculate bottom padding to ensure content is visible above tab bar
  const getBottomPadding = () => {
    const safeAreaBottom = insets.bottom > 0 ? insets.bottom : 0;
    return TAB_BAR_HEIGHT + safeAreaBottom + 20; // 20px extra padding for comfort
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-accent-100 justify-center items-center">
        <ActivityIndicator size="large" color="#0061FF" />
        <Text className="font-rubik mt-4">Loading...</Text>
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
            <Text className="font-rubik-semibold text-black-300 text-xl">Add Expense</Text>
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

            {/* Category Selection with Add New Option */}
            <View className="mx-4 mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-rubik text-black-100">Category</Text>
                <TouchableOpacity 
                  onPress={() => setShowCategoryModal(true)}
                  className="flex-row items-center"
                >
                  <Ionicons name="add-circle-outline" size={18} color="#0061FF" />
                  <Text className="font-rubik-medium text-primary-300 ml-1">Add New</Text>
                </TouchableOpacity>
              </View>
              
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
                      <Ionicons 
                        name={cat.icon || 'grid-outline'} 
                        size={16} 
                        color={cat.color || '#0061FF'} 
                      />
                    </View>
                    <Text 
                      className={`font-rubik ${categoryId === cat.id ? 'text-primary-300 font-rubik-medium' : 'text-black-200'}`}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                
                {categories.length === 0 && (
                  <TouchableOpacity
                    className="p-3 rounded-xl bg-white"
                    onPress={() => setShowCategoryModal(true)}
                  >
                    <Text className="font-rubik text-black-200">No categories. Add one now.</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Budget Selection */}
            {budgets.length > 0 && (
              <View className="mx-4 mb-4">
                <Text className="font-rubik text-black-100 mb-2">Assign to Budget</Text>
                <View className="flex-row flex-wrap">
                  {budgets.map((budget) => (
                    <TouchableOpacity
                      key={budget.id}
                      className={`mr-2 mb-2 p-3 rounded-xl flex-row items-center ${budgetId === budget.id ? 'bg-primary-200' : 'bg-white'}`}
                      onPress={() => setBudgetId(budget.id)}
                    >
                      <View 
                        className="w-8 h-8 rounded-full items-center justify-center mr-2 bg-primary-100"
                      >
                        <Ionicons 
                          name="wallet-outline" 
                          size={16} 
                          color="#0061FF" 
                        />
                      </View>
                      <Text 
                        className={`font-rubik ${budgetId === budget.id ? 'text-primary-300 font-rubik-medium' : 'text-black-200'}`}
                      >
                        {budget.name || 'Budget'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

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
            <View className="mx-4 mb-4 bg-white p-4 rounded-2xl flex-row justify-between items-center">
              <Text className="font-rubik text-black-300">Recurring Expense</Text>
              <TouchableOpacity
                onPress={() => setIsRecurring(!isRecurring)}
                className={`w-12 h-6 rounded-full px-1 flex-row items-center ${isRecurring ? 'bg-primary-300 justify-end' : 'bg-gray-300 justify-start'}`}
              >
                <View className="w-4 h-4 rounded-full bg-white" />
              </TouchableOpacity>
            </View>

            {/* Location Input */}
            <View className="mx-4 mb-4">
              <Text className="font-rubik text-black-100 mb-2">Location (Optional)</Text>
              <TextInput
                className="bg-white p-4 rounded-2xl font-rubik text-black-300"
                placeholder="Where was this expense made?"
                value={location}
                onChangeText={setLocation}
                onFocus={() => scrollToInput(300)}
              />
            </View>

            {/* Note: removed for now due to database schema issues */}
            {/*
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
            */}

            {/* Save Button */}
            <View className="mx-4 mb-6">
              <TouchableOpacity 
                className="bg-primary-300 p-4 rounded-xl"
                onPress={handleSaveExpense}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="font-rubik-medium text-white text-center">Save Expense</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Scroll to top button - shows when scrolled down and keyboard is not visible */}
          {scrollYPosition > 100 && !keyboardVisible && (
            <TouchableOpacity 
              className="absolute bottom-6 right-6 bg-primary-300 w-12 h-12 rounded-full items-center justify-center shadow-md"
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
              backgroundColor: 'rgba(0, 97, 255, 0.3)',
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
                backgroundColor: '#0061FF',
              }}
            />
          </Animated.View>

          {/* Add New Category Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={showCategoryModal}
            onRequestClose={() => setShowCategoryModal(false)}
          >
            <View className="flex-1 justify-end bg-black bg-opacity-50">
              <View className="bg-white rounded-t-3xl p-6">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="font-rubik-semibold text-black-300 text-xl">Add New Category</Text>
                  <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                    <Ionicons name="close" size={24} color="#191D31" />
                  </TouchableOpacity>
                </View>
                
                {/* Category Name Input */}
                <Text className="font-rubik text-black-100 mb-2">Category Name</Text>
                <TextInput
                  className="bg-accent-100 p-4 rounded-2xl font-rubik text-black-300 mb-4"
                  placeholder="Enter category name"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
                
                {/* Color Selection */}
                <Text className="font-rubik text-black-100 mb-2">Color</Text>
                <View className="flex-row flex-wrap mb-4">
                  {availableColors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setNewCategoryColor(color)}
                      className={`m-1 p-1 rounded-lg ${newCategoryColor === color ? 'border-2 border-black' : ''}`}
                    >
                      <View 
                        className="w-10 h-10 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* Icon Selection */}
                <Text className="font-rubik text-black-100 mb-2">Icon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                  {availableIcons.map((icon) => (
                    <TouchableOpacity
                      key={icon.name}
                      onPress={() => setNewCategoryIcon(icon.name)}
                      className={`mr-3 p-2 rounded-lg items-center ${newCategoryIcon === icon.name ? 'bg-primary-100' : 'bg-accent-100'}`}
                    >
                      <View className="w-10 h-10 rounded-full bg-white items-center justify-center mb-1">
                        <Ionicons name={icon.name} size={20} color={newCategoryColor} />
                      </View>
                      <Text className="font-rubik text-xs">{icon.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {/* Create Button */}
                <TouchableOpacity 
                  className="bg-primary-300 p-4 rounded-xl"
                  onPress={handleAddNewCategory}
                  disabled={addingCategory}
                >
                  {addingCategory ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="font-rubik-medium text-white text-center">Create Category</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}