// app/(root)/(tabs)/explore.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthProvider';

// Import Supabase functions
import { 
  getExpenses, 
  getIncome,
  getCategories
} from '@/lib/supabase';

export default function ExplorePage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [activeMonth, setActiveMonth] = useState(new Date());
  const [months, setMonths] = useState<Date[]>([]);
  
  // Generate last 12 months for filter
  useEffect(() => {
    const generateMonths = () => {
      const monthsArray: Date[] = [];
      const today = new Date();
      for (let i = 0; i < 12; i++) {
        const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
        monthsArray.push(month);
      }
      return monthsArray;
    };
    
    setMonths(generateMonths());
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [activeFilter, activeMonth]);
  
  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // First, get categories for proper display
      const categoriesData = await getCategories();
      console.log('Categories fetched:', categoriesData?.length || 0);
      setCategories(categoriesData || []);
      
      // Calculate date range for current month
      const startDate = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1);
      const endDate = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const filters = {
        start_date: startDateStr,
        end_date: endDateStr
      };
      
      // Fetch expenses and income
      const [expensesData, incomeData] = await Promise.all([
        getExpenses(filters),
        getIncome(filters)
      ]);
      
      console.log('Expenses fetched:', expensesData?.length || 0);
      console.log('Income fetched:', incomeData?.length || 0);
      
      // Convert expenses to transaction format
      const expenseTransactions = (expensesData || []).map(expense => {
        // Find category from our categories list
        const category = categoriesData?.find(cat => cat.id === expense.category_id) || {
          id: expense.category_id || 'unknown',
          name: 'Other',
          color: '#AAAAAA',
          icon: 'albums'
        };
        
        return {
          id: expense.id,
          amount: Number(expense.amount) || 0,
          description: expense.description || 'Unlabeled Expense',
          category: {
            id: category.id,
            name: category.name,
            icon: getCategoryIcon(category.name, category.icon),
            color: category.color || '#0061FF'
          },
          date: new Date(expense.date || expense.created_at),
          note: expense.note || '',
          type: 'expense'
        };
      });
      
      // Convert income to transaction format
      const incomeTransactions = (incomeData || []).map(income => {
        return {
          id: income.id,
          amount: Number(income.amount) || 0,
          description: income.description || 'Income',
          category: {
            id: 'income',
            name: 'Income',
            icon: 'cash-outline',
            color: '#4CAF50'
          },
          date: new Date(income.date || income.created_at),
          note: income.note || '',
          type: 'income'
        };
      });
      
      // Combine and sort transactions
      let allTransactions = [...expenseTransactions, ...incomeTransactions];
      
      // Apply filter
      if (activeFilter !== 'all') {
        allTransactions = allTransactions.filter(t => t.type === activeFilter);
      }
      
      // Sort by date (newest first)
      allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transaction data:', error);
      Alert.alert('Error', 'Failed to load transaction data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };
  
  const getCategoryIcon = (categoryName = '', defaultIcon = 'albums') => {
    const categoryIcons = {
      'Food': 'fast-food-outline',
      'Transport': 'bus-outline',
      'Housing': 'home-outline',
      'Education': 'book-outline',
      'Entertainment': 'film-outline',
      'Shopping': 'cart-outline',
      'Health': 'fitness-outline',
      'Miscellaneous': 'albums-outline',
      'Income': 'cash-outline'
    };
    
    return categoryIcons[categoryName] || defaultIcon || 'albums-outline';
  };
  
  // Calculate summary stats
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const balance = totalIncome - totalExpense;
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };
  
  // Format date
  const formatDate = (dateString: Date) => {
    return dateString.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Group transactions by date
  const groupedTransactions = () => {
    const groups: Record<string, any[]> = {};
    
    transactions.forEach(transaction => {
      const dateStr = transaction.date.toISOString().split('T')[0];
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(transaction);
    });
    
    return Object.entries(groups).map(([date, transactions]) => ({
      date: new Date(date),
      transactions
    })).sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending
  };

  const renderTransactionItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      className="flex-row items-center p-4 bg-white rounded-xl mb-2"
      onPress={() => {
        // View transaction details
        if (item.type === 'expense') {
          router.push({ pathname: '/expense/[id]', params: { id: item.id } });
        } else {
          router.push({ pathname: '/income/[id]', params: { id: item.id } });
        }
      }}
    >
      <View 
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: `${item.category.color}20` }}
      >
        <Ionicons name={item.category.icon} size={20} color={item.category.color} />
      </View>
      
      <View className="flex-1">
        <Text className="font-rubik-medium text-black-300">{item.description}</Text>
        {item.note ? (
          <Text className="font-rubik text-black-100 text-xs mt-1">{item.note}</Text>
        ) : null}
      </View>
      
      <View className="items-end">
        <Text 
          className={`font-rubik-medium ${item.type === 'income' ? 'text-green-500' : 'text-danger'}`}
        >
          {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
        <Text className="font-rubik text-black-100 text-xs mt-1">
          {formatDate(item.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderDateGroup = ({ item }: { item: any }) => (
    <View className="mb-4">
      <Text className="font-rubik-medium text-black-200 mb-2 px-4">
        {item.date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        })}
      </Text>
      
      {item.transactions.map((transaction: any) => (
        <View key={transaction.id} className="px-4">
          {renderTransactionItem({ item: transaction })}
        </View>
      ))}
    </View>
  );

  const renderMonthItem = ({ item }: { item: Date }) => (
    <TouchableOpacity
      className={`px-4 py-2 mx-1 rounded-xl ${
        item.getMonth() === activeMonth.getMonth() && 
        item.getFullYear() === activeMonth.getFullYear() 
          ? 'bg-primary-300' 
          : 'bg-white'
      }`}
      onPress={() => setActiveMonth(item)}
    >
      <Text 
        className={`font-rubik-medium ${
          item.getMonth() === activeMonth.getMonth() && 
          item.getFullYear() === activeMonth.getFullYear() 
            ? 'text-white' 
            : 'text-black-200'
        }`}
      >
        {item.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
      </Text>
    </TouchableOpacity>
  );
  
  return (
    <SafeAreaView className="flex-1 bg-accent-100">
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 flex-row items-center justify-between">
          <Text className="font-rubik-semibold text-black-300 text-xl">Transaction History</Text>
          <TouchableOpacity 
            className="p-2"
            onPress={() => {
              router.push('/transaction-report');
            }}
          >
            <Ionicons name="analytics-outline" size={24} color="#191D31" />
          </TouchableOpacity>
        </View>

        {/* Month Selector */}
        <View className="mb-4">
          <FlatList
            data={months}
            renderItem={renderMonthItem}
            keyExtractor={(item) => item.toISOString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12 }}
            initialScrollIndex={0}
          />
        </View>

        {/* Summary Card */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <View className="flex-row justify-between mb-3">
            <View>
              <Text className="font-rubik text-black-100 mb-1">Total Income</Text>
              <Text className="font-rubik-semibold text-green-500">{formatCurrency(totalIncome)}</Text>
            </View>
            <View>
              <Text className="font-rubik text-black-100 mb-1">Total Expense</Text>
              <Text className="font-rubik-semibold text-danger">{formatCurrency(totalExpense)}</Text>
            </View>
          </View>
          <View className="pt-3 border-t border-gray-100">
            <Text className="font-rubik text-black-100 mb-1">Balance</Text>
            <Text 
              className={`font-rubik-semibold ${balance >= 0 ? 'text-green-500' : 'text-danger'}`}
            >
              {formatCurrency(balance)}
            </Text>
          </View>
        </View>

        {/* Filter Buttons */}
        <View className="flex-row mx-4 mb-4">
          <TouchableOpacity
            className={`flex-1 py-3 px-2 rounded-xl mr-2 ${activeFilter === 'all' ? 'bg-primary-300' : 'bg-white'}`}
            onPress={() => setActiveFilter('all')}
          >
            <Text 
              className={`font-rubik-medium text-center ${activeFilter === 'all' ? 'text-white' : 'text-black-200'}`}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 px-2 rounded-xl mr-2 ${activeFilter === 'expense' ? 'bg-primary-300' : 'bg-white'}`}
            onPress={() => setActiveFilter('expense')}
          >
            <Text 
              className={`font-rubik-medium text-center ${activeFilter === 'expense' ? 'text-white' : 'text-black-200'}`}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 px-2 rounded-xl ${activeFilter === 'income' ? 'bg-primary-300' : 'bg-white'}`}
            onPress={() => setActiveFilter('income')}
          >
            <Text 
              className={`font-rubik-medium text-center ${activeFilter === 'income' ? 'text-white' : 'text-black-200'}`}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transaction List */}
        {loading && !refreshing ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#0061FF" />
          </View>
        ) : transactions.length > 0 ? (
          <FlatList
            data={groupedTransactions()}
            renderItem={renderDateGroup}
            keyExtractor={(item) => item.date.toISOString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 70 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        ) : (
          <View className="flex-1 justify-center items-center px-4">
            <Ionicons name="document-text-outline" size={64} color="#8C8E98" />
            <Text className="font-rubik-medium text-black-200 text-lg mt-4 mb-2">No transactions found</Text>
            <Text className="font-rubik text-black-100 text-center">
              There are no transactions for {activeMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}.
              {activeFilter !== 'all' ? ` Try changing the filter or adding a new ${activeFilter}.` : ' Add a new transaction to get started.'}
            </Text>
          </View>
        )}

        {/* Add Transaction Float Buttons */}
        <View className="absolute bottom-6 right-6 flex-row">
          <TouchableOpacity 
            className="bg-green-500 w-14 h-14 rounded-full items-center justify-center shadow-md mr-3"
            onPress={() => router.push('/income/add')}
          >
            <Ionicons name="add" size={24} color="white" />
            <Ionicons name="cash-outline" size={12} color="white" style={{ position: 'absolute', bottom: 10 }} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="bg-primary-300 w-14 h-14 rounded-full items-center justify-center shadow-md"
            onPress={() => router.push('/(root)/(tabs)/expense')}
          >
            <Ionicons name="add" size={24} color="white" />
            <Ionicons name="cart-outline" size={12} color="white" style={{ position: 'absolute', bottom: 10 }} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}