import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    KeyboardAvoidingView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import icons from '@/constants/icons';
import { supabase } from "@/utils/supabase";
import * as WebBrowser from 'expo-web-browser';

// Preload browser for authentication
export const useWarmUpBrowser = () => {
    useEffect(() => {
        void WebBrowser.warmUpAsync();
        return () => {
            void WebBrowser.coolDownAsync();
        };
    }, []);
};

// Sample illustrations - replace with your actual assets
const illustrationLogin = require('@/assets/images/loginscreen.png');

// Handle any pending authentication sessions
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    useWarmUpBrowser();

    // Use expo-router for navigation
    const router = useRouter();

    // States
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Scroll ref for keyboard handling
    const scrollViewRef = useRef(null);

    // Form validation states
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Validation functions
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            setEmailError('Email is required');
            return false;
        } else if (!emailRegex.test(email)) {
            setEmailError('Please enter a valid email');
            return false;
        }
        setEmailError('');
        return true;
    };

    const validatePassword = (password) => {
        if (!password) {
            setPasswordError('Password is required');
            return false;
        }
        setPasswordError('');
        return true;
    };

    // Handle login with validation and Supabase
    const handleLogin = async () => {
        const isEmailValid = validateEmail(email);
        const isPasswordValid = validatePassword(password);

        if (isEmailValid && isPasswordValid) {
            setLoading(true);
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) {
                    throw error;
                }

                const user = data.user;
                if (!user) {
                    throw new Error('User not found');
                }

                // Check if profile exists
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profileError) {
                    throw profileError;
                }

                // If no profile exists, create one
                if (!profile) {
                    await supabase
                        .from('profiles')
                        .insert([{
                            id: user.id,
                            status: 'online',
                            created_at: new Date().toISOString()
                        }]);
                }
                
                // Navigate to main app
                router.replace('/(tabs)');
                
            } catch (error) {
                console.error('Login error:', error);
                Alert.alert('Login Error', error.message || 'Failed to login');
            } finally {
                setLoading(false);
            }
        }
    };

    // Input styles based on validation state
    const getInputStyle = (error) => {
        return error ? "border-red-500" : "border-gray-300";
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <ScrollView
                    ref={scrollViewRef}
                    className="flex-1"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1 }}
                >
                    {/* Gradient header with illustration */}
                    <LinearGradient
                        colors={['#4f46e5', '#7c3aed']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ 
                          paddingTop: 48, 
                          paddingBottom: 24, 
                          paddingHorizontal: 20,
                          borderBottomLeftRadius: 24, 
                          borderBottomRightRadius: 24
                      }}
                    >
                        <View className="items-center justify-center">
                            <Image
                                source={illustrationLogin}
                                className="w-40 h-40"
                                resizeMode="contain"
                                accessibilityLabel="Login illustration"
                            />
                        </View>
                        
                        {/* App name and tagline */}
                        <View className="mt-2">
                            <Text className="text-white text-3xl font-bold text-center">
                                Health Sync
                            </Text>
                            <Text className="text-white text-base text-center opacity-90 mt-1">
                                Your health, our priority
                            </Text>
                        </View>
                        
                        {/* Decorative elements */}
                        <View className="absolute -bottom-4 -left-10 w-24 h-24 rounded-full bg-white opacity-10" />
                        <View className="absolute top-10 right-0 w-16 h-16 rounded-full bg-white opacity-10" />
                    </LinearGradient>

                    {/* Form container */}
                    <View className="px-5 flex-1">
                       {/* App logo */}
                       <View className="items-center">
                            <Image
                                source={icons.logo}
                                className="w-32 h-32"
                                resizeMode="contain"
                                accessibilityLabel="App logo"
                            />
                        </View>
                        <View className="bg-white">
                            <Text className="text-gray-800 text-2xl font-semibold text-center">
                                Welcome Back
                            </Text>

                            {/* Email input with validation */}
                            <View className="mb-4">
                                <Text className="text-gray-700 text-sm mb-1">Email</Text>
                                <View className={`border ${getInputStyle(emailError)} rounded-xl px-4 py-2 flex-row items-center bg-gray-50`}>
                                    <Ionicons name="mail-outline" size={18} color="#6b7280" />
                                    <TextInput
                                        placeholder="name@example.com"
                                        className="flex-1 h-12 ml-2 text-gray-800"
                                        keyboardType="email-address"
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            if (emailError) validateEmail(text);
                                        }}
                                        onBlur={() => validateEmail(email)}
                                        autoCapitalize="none"
                                        accessibilityLabel="Email input field"
                                        testID="email-input"
                                    />
                                </View>
                                {emailError ? <Text className="text-red-500 text-xs mt-1 ml-1">{emailError}</Text> : null}
                            </View>

                            {/* Password input with validation */}
                            <View className="mb-6">
                                <Text className="text-gray-700 text-sm mb-1">Password</Text>
                                <View className={`border ${getInputStyle(passwordError)} rounded-xl px-4 py-2 flex-row items-center bg-gray-50`}>
                                    <Ionicons name="lock-closed-outline" size={18} color="#6b7280" />
                                    <TextInput
                                        placeholder="••••••••"
                                        className="flex-1 h-12 ml-2 text-gray-800"
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            if (passwordError) validatePassword(text);
                                        }}
                                        onBlur={() => validatePassword(password)}
                                        accessibilityLabel="Password input field"
                                        testID="password-input"
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        className="p-2"
                                        accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                                        accessibilityRole="button"
                                    >
                                        <Ionicons
                                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                                            size={20}
                                            color="#6b7280"
                                        />
                                    </TouchableOpacity>
                                </View>
                                {passwordError ? <Text className="text-red-500 text-xs mt-1 ml-1">{passwordError}</Text> : null}
                            </View>

                            {/* Login button with loading state */}
                            <TouchableOpacity
                                className="bg-indigo-600 py-3.5 rounded-xl items-center justify-center mb-5 shadow-md"
                                onPress={handleLogin}
                                activeOpacity={0.8}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text className="text-white text-base font-semibold">
                                        Sign In
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {/* Register link */}
                            <View className="flex-row justify-center mt-2">
                                <Text className="text-gray-600">Don't have an account? </Text>
                                <Link href="/signup" replace>
                                    <Text className="text-indigo-600 font-medium">Create Account</Text>
                                </Link>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}