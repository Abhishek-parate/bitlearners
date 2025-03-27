// // app/_layout.tsx
// import { useEffect, useState } from "react";
// import { Stack } from "expo-router";
// import { useFonts } from "expo-font";
// import * as SplashScreen from "expo-splash-screen";
// import { View, Text } from 'react-native';

// import "./global.css";
// import AuthProvider from "../contexts/AuthProvider";
// import { supabase } from "../lib/supabase";

// // Keep the splash screen visible while we fetch resources
// SplashScreen.preventAutoHideAsync();

// export default function RootLayout() {
//   const [initializing, setInitializing] = useState(true);
//   const [initialSession, setInitialSession] = useState(null);
  
//   const [fontsLoaded] = useFonts({
//     "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
//     "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
//     "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
//     "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
//     "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
//     "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
//   });

//   // Check initial session
//   useEffect(() => {
//     async function checkSession() {
//       try {
//         const { data } = await supabase.auth.getSession();
//         setInitialSession(data.session);
//         console.log("Initial session check:", data.session ? "Session exists" : "No session");
//       } catch (e) {
//         console.error("Error checking session:", e);
//       } finally {
//         setInitializing(false);
//       }
//     }
    
//     checkSession();
//   }, []);

//   useEffect(() => {
//     if (fontsLoaded && !initializing) {
//       // This tells the splash screen to hide immediately
//       SplashScreen.hideAsync().catch(() => {
//         /* ignore errors */
//       });
//     }
//   }, [fontsLoaded, initializing]);

//   // Prevent rendering until resources are loaded and initial session check is done
//   if (!fontsLoaded || initializing) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//         <Text>Loading...</Text>
//       </View>
//     );
//   }

//   // Return the root layout once fonts are loaded
//   return (
//     <AuthProvider>
//       <Stack screenOptions={{ headerShown: false }}>
//         {/* Define routes at the root level */}
//         <Stack.Screen name="(auth)" options={{ headerShown: false }} />
//         <Stack.Screen name="(root)" options={{ headerShown: false }} />
//       </Stack>
//     </AuthProvider>
//   );
// }

// app/_layout.tsx
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { View, Text, StyleSheet } from 'react-native';

import "./global.css";
import AuthProvider from "../contexts/AuthProvider";
import { supabase } from "../lib/supabase";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [initialSession, setInitialSession] = useState(null);
  
  const [fontsLoaded] = useFonts({
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
  });

  // Check initial session
  useEffect(() => {
    async function checkSession() {
      try {
        const { data } = await supabase.auth.getSession();
        setInitialSession(data.session);
        console.log("Initial session check:", data.session ? "Session exists" : "No session");
      } catch (e) {
        console.error("Error checking session:", e);
      } finally {
        setInitializing(false);
      }
    }
    
    checkSession();
  }, []);

  useEffect(() => {
    if (fontsLoaded && !initializing) {
      // This tells the splash screen to hide immediately
      SplashScreen.hideAsync().catch(() => {
        /* ignore errors */
      });
    }
  }, [fontsLoaded, initializing]);

  // Prevent rendering until resources are loaded and initial session check is done
  if (!fontsLoaded || initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Return the root layout once fonts are loaded
  return (
    <AuthProvider>
      <View style={styles.container}>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Define routes at the root level */}
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(root)" options={{ headerShown: false }} />
        </Stack>
        
        {/* Watermark overlay */}
        <View style={styles.watermarkContainer} pointerEvents="none">
          <Text style={styles.watermarkText}>DEMO VERSION - bitlearners.com</Text>
        </View>
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermarkText: {
    fontFamily: 'Rubik-Bold',
    fontSize: 40,
    color: 'rgba(0, 97, 255, 0.1)', // Semi-transparent blue
    transform: [{ rotate: '-45deg' }],
    letterSpacing: 3,
  },
});