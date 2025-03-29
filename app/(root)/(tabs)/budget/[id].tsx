// app/budget/[id].tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';

// Import Supabase functions
import { 
  getBudgetDetails, 
  getExpenses, 
  updateBudgetAllocations,
  getCategories,
  supabase
} from '@/lib/supabase';

export default function BudgetDetailPage() {
  const params = useLocalSearchParams();
  const budgetId = params.id;
  const insets = useSafeAreaInsets();
  
  const [budget, setBudget] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [categoryExpenses, setCategoryExpenses] = useState({});
  const [editedAmount, setEditedAmount] = useState('');
  const [viewMode, setViewMode] = useState('allocations'); // 'allocations' or 'expenses'
  
  // Edit Allocation Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  
  useEffect(() => {
    if (budgetId) {
      fetchBudgetDetails();
    }
  }, [budgetId]);
  
  const fetchBudgetDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch budget details including allocations
      const budgetData = await getBudgetDetails(budgetId);
      
      if (!budgetData || !budgetData.id) {
        Alert.alert('Error', 'Budget not found');
        router.back();
        return;
      }
      
      setBudget(budgetData);
      
      // Process allocations
      let allocationsData = [];
      if (budgetData.budget_allocations && Array.isArray(budgetData.budget_allocations)) {
        allocationsData = budgetData.budget_allocations.map(allocation => ({
          ...allocation,
          percentage: (Number(allocation.amount) / Number(budgetData.amount)) * 100,
          spent: 0,
          spentPercentage: 0
        }));
      }
      
      setAllocations(allocationsData);
      
      // Fetch expenses for this budget
      const expensesData = await getExpenses({
        budget_id: budgetId,
        start_date: budgetData.start_date,
        end_date: budgetData.end_date
      });
      
      setExpenses(expensesData || []);
      
      // Calculate spending by category
      const categorySpending = {};
      expensesData.forEach(expense => {
        const catId = expense.category_id;
        if (!catId) return;
        
        categorySpending[catId] = categorySpending[catId] || {
          total: 0,
          expenses: []
        };
        
        categorySpending[catId].total += Number(expense.amount);
        categorySpending[catId].expenses.push(expense);
      });
      
      setCategoryExpenses(categorySpending);
      
      // Update allocations with spending data
      if (allocationsData.length > 0) {
        const updatedAllocations = allocationsData.map(allocation => {
          const spent = categorySpending[allocation.category_id]?.total || 0;
          return {
            ...allocation,
            spent,
            spentPercentage: (spent / Number(allocation.amount)) * 100
          };
        });
        
        setAllocations(updatedAllocations);
      }
      
      // Fetch all categories for edit mode
      const categoriesData = await getCategories();
      setAllCategories(categoriesData || []);
      
      // Set initial edited amount from the budget
      setEditedAmount(budgetData.amount.toString());
      
    } catch (error) {
      console.error('Error fetching budget details:', error);
      Alert.alert('Error', 'Failed to load budget details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAllocationChange = (value, index) => {
    if (!editMode) return;
    
    const numValue = value === '' ? 0 : parseFloat(value);
    const updatedAllocations = [...allocations];
    updatedAllocations[index].amount = numValue;
    
    // Recalculate percentages
    if (budget && parseFloat(editedAmount) > 0) {
      updatedAllocations[index].percentage = (numValue / parseFloat(editedAmount)) * 100;
    }
    
    setAllocations(updatedAllocations);
  };
  
  const handleSliderChange = (value, index) => {
    if (!editMode) return;
    
    const totalValue = parseFloat(editedAmount);
    const newBudget = (value / 100) * totalValue;
    
    const updatedAllocations = [...allocations];
    updatedAllocations[index].amount = newBudget;
    updatedAllocations[index].percentage = value;
    
    setAllocations(updatedAllocations);
  };
  
  const toggleEditMode = () => {
    setEditMode(!editMode);
  };
  
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      // Prepare allocations data
      const updatedAllocations = allocations.map(alloc => ({
        budget_id: budgetId,
        category_id: alloc.category_id,
        amount: alloc.amount
      }));
      
      // Filter out allocations with zero or negative amounts
      const validAllocations = updatedAllocations.filter(alloc => 
        alloc.amount > 0 && alloc.category_id
      );
      
      // First update the budget amount if changed
      if (editedAmount !== budget.amount.toString()) {
        const { error: updateError } = await supabase
          .from('budgets')
          .update({ amount: parseFloat(editedAmount) })
          .eq('id', budgetId);
          
        if (updateError) {
          console.error('Error updating budget amount:', updateError);
          throw updateError;
        }
      }
      
      // Delete existing allocations one by one to avoid RLS issues
      for (const allocation of budget.budget_allocations || []) {
        const { error: deleteError } = await supabase
          .from('budget_allocations')
          .delete()
          .eq('id', allocation.id);
          
        if (deleteError) {
          console.error('Error deleting allocation:', deleteError);
          // Continue despite errors - some might be already deleted
        }
      }
      
      // Insert new allocations (if any)
      if (validAllocations.length > 0) {
        // Insert allocations one by one to better handle errors
        for (const allocation of validAllocations) {
          const { error: insertError } = await supabase
            .from('budget_allocations')
            .insert(allocation);
              
          if (insertError) {
            console.error('Error inserting allocation:', insertError, allocation);
            // Continue with other allocations despite errors
          }
        }
      }
      
      Alert.alert('Success', 'Budget updated successfully');
      setEditMode(false);
      fetchBudgetDetails(); // Refresh data
    } catch (error) {
      console.error('Error updating budget:', error);
      Alert.alert('Error', 'Failed to update budget: ' + error.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleAddAllocation = () => {
    setEditingAllocation({
      id: null,
      budget_id: budgetId,
      category_id: null,
      amount: 0,
      percentage: 0
    });
    setShowEditModal(true);
  };
  
  const handleEditAllocation = (allocation) => {
    setEditingAllocation(allocation);
    setShowEditModal(true);
  };
  
  const saveAllocationEdit = () => {
    if (!editingAllocation || !editingAllocation.category_id) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    
    const isNewAllocation = !editingAllocation.id;
    const updatedAllocations = [...allocations];
    
    if (isNewAllocation) {
      // Add new allocation
      const selectedCategory = allCategories.find(c => c.id === editingAllocation.category_id);
      const newAlloc = {
        ...editingAllocation,
        id: `temp-${Date.now()}`, // Temporary ID
        spent: 0,
        spentPercentage: 0,
        categories: selectedCategory
      };
      
      updatedAllocations.push(newAlloc);
    } else {
      // Update existing allocation
      const index = updatedAllocations.findIndex(a => a.id === editingAllocation.id);
      if (index !== -1) {
        updatedAllocations[index] = {
          ...updatedAllocations[index],
          ...editingAllocation
        };
      }
    }
    
    setAllocations(updatedAllocations);
    setShowEditModal(false);
    setEditingAllocation(null);
  };
  
  const deleteAllocation = (allocationId) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to remove this allocation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            const updatedAllocations = allocations.filter(a => a.id !== allocationId);
            setAllocations(updatedAllocations);
          }
        }
      ]
    );
  };
  
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };
  
  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };
  
  const getSpendingStatusColor = (percent) => {
    if (percent > 100) {
      return '#F75555'; // Over budget - red
    } else if (percent > 80) {
      return '#FF9800'; // Near limit - orange
    } else {
      return '#4CAF50'; // Good - green
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Calculate total spending and percentage
  const totalSpending = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const totalPercentage = budget ? (totalSpending / Number(budget.amount)) * 100 : 0;
  const spendingStatusColor = getSpendingStatusColor(totalPercentage);
  
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-accent-100 justify-center items-center">
        <ActivityIndicator size="large" color="#0061FF" />
        <Text className="font-rubik mt-4">Loading budget details...</Text>
      </SafeAreaView>
    );
  }
  
  if (!budget) {
    return (
      <SafeAreaView className="flex-1 bg-accent-100 justify-center items-center">
        <Text className="font-rubik text-black-300">Budget not found</Text>
        <TouchableOpacity 
          className="mt-4 bg-primary-300 px-4 py-2 rounded-xl"
          onPress={() => router.back()}
        >
          <Text className="font-rubik-medium text-white">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  const renderExpenseItem = ({ item }) => {
    const category = item.categories || {};
    
    return (
      <View className="bg-white p-4 rounded-xl mb-3 mx-4">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <View 
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: `${category.color || '#0061FF'}20` }}
            >
              <Ionicons name={category.icon || 'grid-outline'} size={20} color={category.color || '#0061FF'} />
            </View>
            
            <View className="flex-1">
              <Text className="font-rubik-medium text-black-300">{item.description}</Text>
              {item.note ? (
                <Text className="font-rubik text-black-100 text-xs mt-1">{item.note}</Text>
              ) : null}
            </View>
          </View>
          
          <View className="items-end">
            <Text className="font-rubik-medium text-danger">-{formatCurrency(item.amount)}</Text>
            <Text className="font-rubik text-black-100 text-xs mt-1">
              {formatDate(item.date)}
            </Text>
          </View>
        </View>
      </View>
    );
  };
  
  return (
    <SafeAreaView className="flex-1 bg-accent-100" style={{ paddingBottom: insets.bottom }}>
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#191D31" />
          </TouchableOpacity>
          <Text className="font-rubik-semibold text-black-300 text-xl flex-1">{budget.name}</Text>
          <TouchableOpacity 
            className="p-2"
            onPress={toggleEditMode}
          >
            <Ionicons name={editMode ? "close" : "create-outline"} size={24} color="#191D31" />
          </TouchableOpacity>
        </View>
        
        {/* Budget Summary Card */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <Text className="font-rubik text-black-100 mb-1">Period</Text>
          <Text className="font-rubik-medium text-black-300 mb-3">
            {formatDateRange(budget.start_date, budget.end_date)}
          </Text>
          
          <View className="flex-row justify-between mb-2">
            <Text className="font-rubik text-black-100">Total Budget</Text>
            {editMode ? (
              <View className="flex-row items-center">
                <Text className="font-rubik text-black-300 mr-1">₹</Text>
                <TextInput
                  className="font-rubik-medium text-black-300 w-20 text-right"
                  keyboardType="decimal-pad"
                  value={editedAmount}
                  onChangeText={setEditedAmount}
                />
              </View>
            ) : (
              <Text className="font-rubik-medium text-black-300">{formatCurrency(budget.amount)}</Text>
            )}
          </View>
          
          <View className="flex-row justify-between mb-3">
            <Text className="font-rubik text-black-100">Total Spent</Text>
            <View className="flex-row items-center">
              <Text 
                className="font-rubik-medium mr-1"
                style={{ color: spendingStatusColor }}
              >
                {formatCurrency(totalSpending)}
              </Text>
              <Text className="font-rubik text-black-100 text-xs">
                ({Math.round(totalPercentage)}%)
              </Text>
            </View>
          </View>
          
          <View className="flex-row justify-between mb-1">
            <Text className="font-rubik text-black-100">Remaining</Text>
            <Text className="font-rubik-medium text-black-300">
              {formatCurrency(Number(budget.amount) - totalSpending)}
            </Text>
          </View>
          
          {/* Progress Bar */}
          <View className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
            <View 
              className="h-full rounded-full"
              style={{ 
                width: `${Math.min(totalPercentage, 100)}%`,
                backgroundColor: spendingStatusColor
              }}
            />
          </View>
        </View>
        
        {/* View Toggle */}
        <View className="mx-4 flex-row mb-4">
          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl ${viewMode === 'allocations' ? 'bg-primary-300' : 'bg-white'}`}
            onPress={() => setViewMode('allocations')}
          >
            <Text 
              className={`text-center font-rubik-medium ${viewMode === 'allocations' ? 'text-white' : 'text-black-200'}`}
            >
              Allocations
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl ${viewMode === 'expenses' ? 'bg-primary-300' : 'bg-white'}`}
            onPress={() => setViewMode('expenses')}
          >
            <Text 
              className={`text-center font-rubik-medium ${viewMode === 'expenses' ? 'text-white' : 'text-black-200'}`}
            >
              Expenses
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Allocations View */}
        {viewMode === 'allocations' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            <View className="mx-4 mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-rubik-medium text-black-300 text-lg">Category Allocations</Text>
                {editMode && (
                  <TouchableOpacity 
                    className="flex-row items-center"
                    onPress={handleAddAllocation}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#0061FF" />
                    <Text className="font-rubik-medium text-primary-300 ml-1">Add</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {allocations.length > 0 ? (
                allocations.map((allocation, index) => {
                  const category = allocation.categories || {};
                  const color = category.color || '#0061FF';
                  const spentPercent = allocation.spentPercentage || 0;
                  const spentColor = getSpendingStatusColor(spentPercent);
                  
                  return (
                    <View key={allocation.id} className="bg-white p-4 rounded-2xl mb-3">
                      <View className="flex-row justify-between items-center mb-2">
                        <View className="flex-row items-center flex-1">
                          <View 
                            className="w-8 h-8 rounded-full items-center justify-center mr-2"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            <Ionicons 
                              name={category.icon || 'grid-outline'} 
                              size={16} 
                              color={color} 
                            />
                          </View>
                          <Text className="font-rubik-medium text-black-300">{category.name || 'Unknown'}</Text>
                        </View>
                        
                        {editMode ? (
                          <View className="flex-row">
                            <TouchableOpacity 
                              className="p-2 mr-1"
                              onPress={() => handleEditAllocation(allocation)}
                            >
                              <Ionicons name="create-outline" size={18} color="#0061FF" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              className="p-2"
                              onPress={() => deleteAllocation(allocation.id)}
                            >
                              <Ionicons name="trash-outline" size={18} color="#F75555" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View className="flex-row items-center">
                            <Text className="font-rubik-medium text-black-300">
                              {formatCurrency(allocation.amount)}
                            </Text>
                            <Text className="font-rubik text-black-100 text-xs ml-1">
                              ({Math.round(allocation.percentage || 0)}%)
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {editMode ? (
                        <View className="flex-row items-center mt-2">
                          <View className="flex-row items-center mr-3">
                            <Text className="font-rubik text-black-300 mr-1">₹</Text>
                            <TextInput
                              className="font-rubik text-black-300 w-16 text-right"
                              keyboardType="decimal-pad"
                              value={allocation.amount.toString()}
                              onChangeText={(value) => handleAllocationChange(value, index)}
                            />
                          </View>
                          
                          <Slider
                            style={{flex: 1, height: 40}}
                            minimumValue={0}
                            maximumValue={100}
                            step={1}
                            value={allocation.percentage || 0}
                            onValueChange={(value) => handleSliderChange(value, index)}
                            minimumTrackTintColor={color}
                            maximumTrackTintColor="#E0E0E0"
                            thumbTintColor={color}
                          />
                          <Text className="font-rubik text-black-100 ml-2 w-10 text-right">
                            {Math.round(allocation.percentage || 0)}%
                          </Text>
                        </View>
                      ) : (
                        <View>
                          <View className="flex-row justify-between mt-2 mb-1">
                            <Text className="font-rubik text-black-100">Spent</Text>
                            <View className="flex-row items-center">
                              <Text 
                                className="font-rubik-medium mr-1"
                                style={{ color: spentColor }}
                              >
                                {formatCurrency(allocation.spent)}
                              </Text>
                              <Text className="font-rubik text-black-100 text-xs">
                                ({Math.round(spentPercent)}%)
                              </Text>
                            </View>
                          </View>
                          
                          {/* Progress Bar */}
                          <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <View 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${Math.min(spentPercent, 100)}%`,
                                backgroundColor: spentColor
                              }}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View className="bg-white p-4 rounded-2xl items-center justify-center py-8">
                  <Ionicons name="wallet-outline" size={40} color="#8C8E98" />
                  <Text className="font-rubik-medium text-black-200 mt-2">No allocations found</Text>
                  {editMode && (
                    <TouchableOpacity 
                      className="mt-4 bg-primary-300 px-4 py-2 rounded-xl"
                      onPress={handleAddAllocation}
                    >
                      <Text className="font-rubik-medium text-white">Add Allocation</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            
            {editMode && (
              <View className="mx-4 mb-6">
                <TouchableOpacity 
                  className="bg-primary-300 p-4 rounded-xl"
                  onPress={handleSaveChanges}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="font-rubik-medium text-white text-center">Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
        
        {/* Expenses View */}
        {viewMode === 'expenses' && (
          expenses.length > 0 ? (
            <FlatList
              data={expenses}
              renderItem={renderExpenseItem}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingVertical: 4 }}
            />
          ) : (
            <View className="flex-1 justify-center items-center px-4">
              <Ionicons name="receipt-outline" size={64} color="#8C8E98" />
              <Text className="font-rubik-medium text-black-200 text-lg mt-4 mb-2">No expenses yet</Text>
              <Text className="font-rubik text-black-100 text-center mb-6">
                Add expenses to this budget to track your spending.
              </Text>
              <TouchableOpacity 
                className="bg-primary-300 p-4 rounded-xl"
                onPress={() => router.push('/expense/add')}
              >
                <Text className="font-rubik-medium text-white">Add Expense</Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </View>
      
      {/* Edit Allocation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View className="flex-1 justify-end bg-black bg-opacity-50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-rubik-semibold text-black-300 text-xl">
                {editingAllocation?.id ? 'Edit Allocation' : 'Add Allocation'}
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#191D31" />
              </TouchableOpacity>
            </View>
            
            {/* Category Selection */}
            <Text className="font-rubik text-black-100 mb-2">Category</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {allCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  className={`mr-3 p-2 rounded-lg items-center ${
                    editingAllocation?.category_id === category.id 
                      ? 'bg-primary-100' 
                      : 'bg-accent-100'
                  }`}
                  onPress={() => setEditingAllocation({
                    ...editingAllocation,
                    category_id: category.id
                  })}
                >
                  <View 
                    className="w-12 h-12 rounded-full items-center justify-center mb-1"
                    style={{ backgroundColor: `${category.color || '#0061FF'}20` }}
                  >
                    <Ionicons 
                      name={category.icon || 'grid-outline'} 
                      size={20} 
                      color={category.color || '#0061FF'} 
                    />
                  </View>
                  <Text className="font-rubik text-xs">{category.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Amount Input */}
            <Text className="font-rubik text-black-100 mb-2">Amount</Text>
            <View className="flex-row items-center bg-accent-100 p-4 rounded-2xl mb-6">
              <Text className="font-rubik-medium text-black-300 mr-2">₹</Text>
              <TextInput
                className="font-rubik-medium text-black-300 flex-1"
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={editingAllocation?.amount?.toString() || ''}
                onChangeText={(value) => setEditingAllocation({
                  ...editingAllocation,
                  amount: value === '' ? 0 : parseFloat(value)
                })}
              />
            </View>
            
            {/* Save Button */}
            <TouchableOpacity 
              className="bg-primary-300 p-4 rounded-xl"
              onPress={saveAllocationEdit}
            >
              <Text className="font-rubik-medium text-white text-center">Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}