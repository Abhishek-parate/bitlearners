import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthProvider';

// Import Supabase functions
import { 
  getProfile, 
  updateProfile, 
  clearSession, 
  supabase 
} from '@/lib/supabase';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Currency selection
  const [currency, setCurrency] = useState('USD');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const currencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CNY'];
  
  useEffect(() => {
    fetchProfile();
  }, []);
  
  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        console.log('No user found in profile page');
        return;
      }
      
      const profileData = await getProfile();
      
      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || '');
        setCurrency(profileData.currency || 'USD');
      } else {
        console.log('No profile found, profile may need to be created');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out', 
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Sign Out',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              setUser(null);
              // Clear any stored session data
              await clearSession();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };
  
  const handleEditProfile = () => {
    setShowEditModal(true);
  };
  
  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      
      const updates = {
        full_name: fullName,
        // Add other profile fields as needed
      };
      
      const updatedProfile = await updateProfile(updates);
      
      if (updatedProfile) {
        setProfile(updatedProfile);
        setShowEditModal(false);
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };
  
  const handleCurrencyChange = () => {
    setShowCurrencyModal(true);
  };
  
  const handleSelectCurrency = async (selectedCurrency) => {
    try {
      setCurrency(selectedCurrency);
      setShowCurrencyModal(false);
      
      // Update profile with new currency
      const updates = {
        currency: selectedCurrency
      };
      
      const updatedProfile = await updateProfile(updates);
      
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
    } catch (error) {
      console.error('Error updating currency:', error);
      Alert.alert('Error', 'Failed to update currency');
    }
  };
  
  const handleThemeToggle = (value) => {
    setDarkMode(value);
    // In a real app, you'd save this preference and apply the theme
  };
  
  const handleNotificationsToggle = (value) => {
    setNotifications(value);
    // In a real app, you'd save this preference and manage notifications
  };
  
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-accent-100 justify-center items-center">
        <ActivityIndicator size="large" color="#0061FF" />
        <Text className="font-rubik mt-4">Loading profile...</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView className="flex-1 bg-accent-100">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 flex-row justify-between items-center">
          <Text className="font-rubik-semibold text-black-300 text-xl">Profile</Text>
          <TouchableOpacity onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color="#F75555" />
          </TouchableOpacity>
        </View>
        
        {/* Profile Card */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <View className="flex-row items-center">
            {profile?.avatar_url ? (
              <Image 
                source={{ uri: profile.avatar_url }} 
                className="w-20 h-20 rounded-full bg-primary-100"
              />
            ) : (
              <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center">
                <Text className="font-rubik-bold text-primary-300 text-2xl">
                  {getInitials(profile?.full_name || user?.email)}
                </Text>
              </View>
            )}
            
            <View className="ml-4 flex-1">
              <Text className="font-rubik-medium text-black-300 text-lg">
                {profile?.full_name || 'Student'}
              </Text>
              <Text className="font-rubik text-black-100">
                {user?.email}
              </Text>
              <TouchableOpacity 
                className="bg-primary-100 px-3 py-1 rounded-full mt-2 self-start"
                onPress={handleEditProfile}
              >
                <Text className="font-rubik-medium text-primary-300 text-sm">Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Financial Summary */}
        <View className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
          <Text className="font-rubik-medium text-black-300 text-lg mb-3">Financial Summary</Text>
          
          <View className="flex-row justify-between mb-3">
            <View className="bg-primary-100 p-3 rounded-xl items-center w-[48%]">
              <Text className="font-rubik text-black-100 mb-1">Monthly Budget</Text>
              <Text className="font-rubik-bold text-primary-300 text-lg">
                ${profile?.budget_limit?.toFixed(2) || '0.00'}
              </Text>
            </View>
            
            <View className="bg-accent-100 p-3 rounded-xl items-center w-[48%]">
              <Text className="font-rubik text-black-100 mb-1">Savings Goal</Text>
              <Text className="font-rubik-bold text-green-700 text-lg">{profile?.spending_goal || 'Not set'}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            className="bg-primary-300 p-3 rounded-xl"
          >
            <Text className="font-rubik-medium text-white text-center">View Financial Reports</Text>
          </TouchableOpacity>
        </View>
        
        {/* Settings */}
        <View className="mx-4 mb-6">
          <Text className="font-rubik-medium text-black-300 text-lg mb-3">Settings</Text>
          
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <TouchableOpacity 
              className="flex-row justify-between items-center p-4 border-b border-accent-100"
              onPress={handleCurrencyChange}
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center mr-3">
                  <Ionicons name="cash-outline" size={18} color="#0061FF" />
                </View>
                <Text className="font-rubik text-black-300">Currency</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="font-rubik text-black-100 mr-1">{currency}</Text>
                <Ionicons name="chevron-forward" size={20} color="#8C8E98" />
              </View>
            </TouchableOpacity>
            
            <View className="flex-row justify-between items-center p-4 border-b border-accent-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center mr-3">
                  <Ionicons name="moon-outline" size={18} color="#0061FF" />
                </View>
                <Text className="font-rubik text-black-300">Dark Mode</Text>
              </View>
              <Switch
                trackColor={{ false: "#E0E0E0", true: "#0061FF40" }}
                thumbColor={darkMode ? "#0061FF" : "#FFFFFF"}
                onValueChange={handleThemeToggle}
                value={darkMode}
              />
            </View>
            
            <View className="flex-row justify-between items-center p-4 border-b border-accent-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center mr-3">
                  <Ionicons name="notifications-outline" size={18} color="#0061FF" />
                </View>
                <Text className="font-rubik text-black-300">Notifications</Text>
              </View>
              <Switch
                trackColor={{ false: "#E0E0E0", true: "#0061FF40" }}
                thumbColor={notifications ? "#0061FF" : "#FFFFFF"}
                onValueChange={handleNotificationsToggle}
                value={notifications}
              />
            </View>
            
            <TouchableOpacity 
              className="flex-row justify-between items-center p-4 border-b border-accent-100"
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center mr-3">
                  <Ionicons name="information-circle-outline" size={18} color="#0061FF" />
                </View>
                <Text className="font-rubik text-black-300">About</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8C8E98" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row justify-between items-center p-4"
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center mr-3">
                  <Ionicons name="help-circle-outline" size={18} color="#0061FF" />
                </View>
                <Text className="font-rubik text-black-300">Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8C8E98" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            className="mt-4 p-4 bg-white rounded-2xl flex-row items-center justify-center"
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color="#F75555" />
            <Text className="font-rubik-medium text-danger ml-2">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View className="flex-1 justify-end bg-black bg-opacity-30">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="font-rubik-semibold text-black-300 text-xl">Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#191D31" />
              </TouchableOpacity>
            </View>
            
            <View className="mb-4">
              <Text className="font-rubik text-black-100 mb-2">Full Name</Text>
              <TextInput
                className="bg-accent-100 p-4 rounded-xl font-rubik text-black-300"
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
            
            {/* Add more profile fields as needed */}
            
            <TouchableOpacity 
              className="bg-primary-300 p-4 rounded-xl mt-2"
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="font-rubik-medium text-white text-center">Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Currency Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCurrencyModal}
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View className="flex-1 justify-end bg-black bg-opacity-30">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="font-rubik-semibold text-black-300 text-xl">Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Ionicons name="close" size={24} color="#191D31" />
              </TouchableOpacity>
            </View>
            
            {currencies.map((currencyOption) => (
              <TouchableOpacity 
                key={currencyOption}
                className={`p-4 rounded-xl mb-2 ${currency === currencyOption ? 'bg-primary-100' : 'bg-accent-100'}`}
                onPress={() => handleSelectCurrency(currencyOption)}
              >
                <Text 
                  className={`font-rubik text-center ${currency === currencyOption ? 'text-primary-300 font-rubik-medium' : 'text-black-300'}`}
                >
                  {currencyOption}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}