import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

import { initDatabase } from './src/core/database/db';
import useAuthStore from './src/store/useAuthStore';
import NetInfo from '@react-native-community/netinfo';
import { SyncEngine } from './src/core/sync/SyncEngine';

// Screens
import AuthScreen from './src/ui/screens/AuthScreen';
import DashboardScreen from './src/ui/screens/incidents/DashboardScreen';
import IncidentsListScreen from './src/ui/screens/incidents/IncidentsListScreen';
import IncidentFormScreen from './src/ui/screens/incidents/IncidentFormScreen';
import SettingsScreen from './src/ui/screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-circle';
          if (route.name === 'Accueil') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Nouveau') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Paramètres') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0B4F8A',
        tabBarInactiveTintColor: 'gray',
        headerStyle: { backgroundColor: '#0B4F8A' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    >
      <Tab.Screen name="Accueil" component={DashboardScreen} options={{ title: 'AlertBook' }} />
      <Tab.Screen name="Nouveau" component={IncidentFormScreen} options={{ title: 'Saisir un incident' }} />
      <Tab.Screen name="Paramètres" component={SettingsScreen} options={{ title: 'Paramètres' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const { token, setToken } = useAuthStore();

  useEffect(() => {
    // 1. Initialisation
    const setupApp = async () => {
      try {
        await initDatabase();
        const storedToken = await SecureStore.getItemAsync('user_token');
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (e) {
        console.error("Erreur lors de l'initialisation", e);
      } finally {
        setIsDbReady(true);
      }
    };
    setupApp();
  }, []);

  useEffect(() => {
    // 2. Écoute des changements réseau pour Auto-Sync globale
    const unsubscribeNet = NetInfo.addEventListener(state => {
      if (state.isConnected && token) {
        // Le réseau est de retour (ou l'app démarre avec réseau), on lance l'auto-sync
        SyncEngine.autoSyncAll(token);
      }
    });

    return () => {
      unsubscribeNet();
    };
  }, [token]);

  if (!isDbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f8' }}>
        <ActivityIndicator size="large" color="#0B4F8A" />
        <Text style={{ marginTop: 10, color: '#4b5563' }}>Initialisation d'AlertBook...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {token === null ? (
          // Utilisateur non connecté -> Écran de connexion (sans Header)
          <Stack.Screen 
            name="Auth" 
            component={AuthScreen} 
            options={{ headerShown: false }} 
          />
        ) : (
          // Utilisateur connecté -> Application principale
          // Utilisateur connecté -> Application principale via Tabs
          <>
            <Stack.Screen 
              name="MainTabs" 
              component={MainTabs} 
              options={{ headerShown: false }} 
            />
            {/* Les écrans qui ne sont pas des onglets vont ici */}
            <Stack.Screen 
              name="IncidentsList" 
              component={IncidentsListScreen} 
              options={{ 
                title: 'Liste des incidents',
                headerStyle: { backgroundColor: '#0B4F8A' },
                headerTintColor: '#fff',
              }} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
