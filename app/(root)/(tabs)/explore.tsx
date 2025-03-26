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
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthProvider';

// Dummy data - replace with actual API calls in real implementation
const DUMMY_TRANSACTIONS = [
  {
    id: '1',
    amount: 25.99,
    description: 'Grocery shopping',
    category: { id: '1', name: 'Food', icon: 'fast-food-outline', color: '#0061FF' },
    date: new Date(2025, 1, 27),
    note: 'Weekly groceries',
    type: 'expense'
  },
  {
    id: '2',
    amount: 12.50,
    description: 'Uber ride',
    category: { id: '2', name: 'Transport', icon: 'bus-outline', color: '#F75555' },
    date: new Date(2025, 1, 26),
    note: '',
    type: 'expense'
  },
  {
    id: '3',
    amount: 500.00,
    description: 'Freelance work',
    category: { id: '7', name: 'Income', icon: 'cash-outline', color: '#4CAF50' },
    date: new Date(2025, 1, 25),
    note: 'Logo design project',
    type: 'income'
  },
  {
    id: '4',
    amount: 15.99,
    description: 'Netflix subscription',
    category: { id: '4', name: 'Entertainment', icon: 'film-outline', color: '#FF9800' },
    date: new Date(2025, 1, 24),
    note: 'Monthly subscription',
    type: 'expense'
  },
  {
    id: '5',
    amount: 950.00,
    description: 'Monthly rent',
    category: { id: '5', name: 'Rent', icon: 'home-outline', color: '#9C27B0' },
    date: new Date(2025, 1, 23),
    note: 'February rent',
    type: 'expense'
  },
  {
    id: '6',
    amount: 34.95,
    description: 'Programming book',
    category: { id: '3', name: 'Books', icon: 'book-outline', color: '#4CAF50' },
    date: new Date(2025, 1, 22),
    note: 'React Native development',
    type: 'expense'
  },
  {
    id: '7',
    amount: 1200.00,
    description: 'Salary',
    category: { id: '7', name: 'Income', icon: 'cash-outline', color: '#4CAF50' },
    date: new Date(2025, 1, 20),
    note: 'Monthly salary',
    type: 'income'
  },
  {
    id: '8',
    amount: 42.50,
    description: 'Dinner with friends',
    category: { id: '1', name: 'Food', icon: 'fast-food-outline', color: '#0061FF' },
    date: new Date(2025, 1, 19),
    note: 'Italian restaurant',
    type: 'expense'
  },
  {
    id: '9',
    amount: 18.99,
    description: 'Phone case',
    category: { id: '6', name: 'Others', icon: 'grid-outline', color: '#795548' },
    date: new Date(2025, 1, 18),
    note: '',
    type: 'expense'
  },
  {
    id: '10',
    amount: 8.75,
    description: 'Coffee and snack',
    category: { id: '1', name: 'Food', icon: 'fast-food-outline', color: '#0061FF' },
    date: new Date(2025, 1, 17),
    note: 'Work break',
    type: 'expense'
  }
];

export default function ExplorePage() {
  const router = useRouter();
  const { profile } = useAuth();
  
  const [transactions, setTransactions] = useState<any[]>([]);
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
    fetchTransactions();
  }, [activeFilter, activeMonth]);
  
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Filter transactions based on selected month and transaction type
      const filteredTransactions = DUMMY_TRANSACTIONS.filter(transaction => {
        const sameMonth = transaction.date.getMonth() === activeMonth.getMonth() && 
                          transaction.date.getFullYear() === activeMonth.getFullYear();
        
        if (activeFilter === 'all') {
          return sameMonth;
        } else {
          return sameMonth && transaction.type === activeFilter;
        }
      });
      
      setTransactions(filteredTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
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
        // Navigate to transaction details
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
              // Navigate to settings or filter options
            }}
          >
            <Ionicons name="options-outline" size={24} color="#191D31" />
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
              {balance >= 0 ? '' : '-'}{formatCurrency(Math.abs(balance))}
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
              There are no transactions for this period. Add a new transaction to get started.
            </Text>
          </View>
        )}

        {/* Add Transaction Button */}
        <TouchableOpacity 
          className="absolute bottom-6 right-6 bg-primary-300 w-14 h-14 rounded-full items-center justify-center shadow-md"
          onPress={() => router.push('/expense')}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}