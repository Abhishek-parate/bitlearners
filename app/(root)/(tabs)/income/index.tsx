// app/(root)/(tabs)/income/explore.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthProvider';

// Import Supabase functions
import { getIncome } from '@/lib/supabase';

export default function IncomeHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incomes, setIncomes] = useState([]);
  const [activeMonth, setActiveMonth] = useState(new Date());
  const [months, setMonths] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  
  // Generate last 12 months for filter
  useEffect(() => {
    const generateMonths = () => {
      const monthsArray = [];
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
    fetchIncome();
  }, [activeMonth]);
  
  const fetchIncome = async () => {
    try {
      setLoading(true);
      
      // Calculate date range for current month
      const startDate = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1);
      const endDate = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Fetch income for the selected month
      const result = await getIncome({
        start_date: startDateStr,
        end_date: endDateStr
      });
      
      console.log(`Fetched ${result?.length || 0} income records`);
      
      if (result) {
        setIncomes(result);
        
        // Calculate total income
        const total = result.reduce((sum, income) => sum + Number(income.amount || 0), 0);
        setTotalIncome(total);
      }
    } catch (error) {
      console.error('Error fetching income:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchIncome();
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return `$${Number(amount).toFixed(2)}`;
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Group income by date
  const groupedIncome = () => {
    const groups = {};
    
    incomes.forEach(income => {
      const dateStr = income.date;
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(income);
    });
    
    return Object.entries(groups).map(([date, incomes]) => ({
      date: new Date(date),
      incomes
    })).sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending
  };

  const renderIncomeItem = ({ item }) => (
    <TouchableOpacity 
      className="flex-row items-center p-4 bg-white rounded-xl mb-2"
      onPress={() => router.push({
        pathname: '/income/[id]',
        params: { id: item.id }
      })}
    >
      <View 
        className="w-10 h-10 rounded-full items-center justify-center mr-3 bg-green-100"
      >
        <Ionicons name="cash-outline" size={20} color="#4CAF50" />
      </View>
      
      <View className="flex-1">
        <Text className="font-rubik-medium text-black-300">{item.description}</Text>
        {item.is_recurring && (
          <View className="flex-row items-center mt-1">
            <Ionicons name="repeat" size={12} color="#4CAF50" />
            <Text className="font-rubik text-green-700 text-xs ml-1">
              {item.frequency ? item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1) : 'Recurring'}
            </Text>
          </View>
        )}
      </View>
      
      <View className="items-end">
        <Text className="font-rubik-bold text-green-700">
          +{formatCurrency(item.amount)}
        </Text>
        <Text className="font-rubik text-black-100 text-xs mt-1">
          {formatDate(item.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderDateGroup = ({ item }) => (
    <View className="mb-4">
      <Text className="font-rubik-medium text-black-200 mb-2 px-4">
        {item.date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        })}
      </Text>
      
      {item.incomes.map((income) => (
        <View key={income.id} className="px-4">
          {renderIncomeItem({ item: income })}
        </View>
      ))}
    </View>
  );

  const renderMonthItem = ({ item }) => (
    <TouchableOpacity
      className={`px-4 py-2 mx-1 rounded-xl ${
        item.getMonth() === activeMonth.getMonth() && 
        item.getFullYear() === activeMonth.getFullYear() 
          ? 'bg-green-600' 
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
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="#191D31" />
            </TouchableOpacity>
            <Text className="font-rubik-semibold text-black-300 text-xl">Income History</Text>
          </View>
          <TouchableOpacity 
            className="p-2 bg-green-100 rounded-full"
            onPress={() => router.push('/income/add')}
          >
            <Ionicons name="add" size={24} color="#4CAF50" />
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
          <Text className="font-rubik text-black-100 mb-1">Total Income</Text>
          <Text className="font-rubik-semibold text-green-700 text-2xl">{formatCurrency(totalIncome)}</Text>
          <Text className="font-rubik text-black-100 text-xs mt-1">
            for {activeMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* Income List */}
        {loading && !refreshing ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        ) : incomes.length > 0 ? (
          <FlatList
            data={groupedIncome()}
            renderItem={renderDateGroup}
            keyExtractor={(item) => item.date.toISOString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 70 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} />
            }
          />
        ) : (
          <View className="flex-1 justify-center items-center px-4">
            <Ionicons name="cash-outline" size={64} color="#8C8E98" />
            <Text className="font-rubik-medium text-black-200 text-lg mt-4 mb-2">No income recorded</Text>
            <Text className="font-rubik text-black-100 text-center">
              There's no income recorded for {activeMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
            </Text>
            <TouchableOpacity 
              className="mt-6 bg-green-600 px-6 py-3 rounded-xl"
              onPress={() => router.push('/income/add')}
            >
              <Text className="font-rubik-medium text-white">Add Income</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Add Income Button */}
        <TouchableOpacity 
          className="absolute bottom-6 right-6 bg-green-600 w-14 h-14 rounded-full items-center justify-center shadow-md"
          onPress={() => router.push('/income/add')}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}