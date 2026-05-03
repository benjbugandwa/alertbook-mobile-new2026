import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
        <ActivityIndicator size="large" color="#1a56db" />
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
          <>
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen} 
              options={{ title: 'Tableau de bord', headerBackVisible: false }} 
            />
            <Stack.Screen 
              name="IncidentsList" 
              component={IncidentsListScreen} 
              options={{ title: 'Liste des incidents' }} 
            />
            <Stack.Screen 
              name="IncidentForm" 
              component={IncidentFormScreen} 
              options={{ title: 'Saisir un incident' }} 
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen} 
              options={{ title: 'Paramètres' }} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
