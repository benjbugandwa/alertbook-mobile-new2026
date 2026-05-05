import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import useAuthStore from '../../store/useAuthStore';
import { ReferenceDataSync } from '../../core/sync/ReferenceDataSync';
import { API_URL } from '../../core/config';
export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const setToken = useAuthStore(state => state.setToken);
  const setUser = useAuthStore(state => state.setUser);

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert('Erreur', 'Veuillez remplir tous les champs');
    }

    setIsLoading(true);
    setSyncStatus('Vérification des identifiants...');

    try {
      // 1. Authentification
      const response = await axios.post(`${API_URL}/login`, 
        { email, password },
        { headers: { 'Accept': 'application/json' } }
      );
      const { token, user } = response.data;

      // 2. Sauvegarde du token et des infos user localement
      await SecureStore.setItemAsync('user_token', token);
      await SecureStore.setItemAsync('user_data', JSON.stringify(user));

      // 3. Téléchargement des données statiques offline (Provinces, etc.)
      setSyncStatus('Téléchargement des données hors-ligne... (Ceci peut prendre un moment)');
      await ReferenceDataSync.syncAll(token);

      // 4. Mise à jour du store (déclenche la navigation vers le tableau de bord)
      setUser(user);
      setToken(token);

    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || 'Identifiants incorrects ou serveur injoignable.';
      Alert.alert('Erreur de connexion', message);
    } finally {
      setIsLoading(false);
      setSyncStatus('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.logoContainer}>
        <Text style={styles.title}>AlertBook</Text>
        <Text style={styles.subtitle}>Collecte d'incidents</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Adresse e-mail"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.btn, isLoading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Se Connecter</Text>}
        </TouchableOpacity>

        {syncStatus ? <Text style={styles.statusText}>{syncStatus}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', justifyContent: 'center', padding: 20 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#0B4F8A' }, // Couleur AlertBook
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 5 },
  form: { backgroundColor: '#fff', padding: 20, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', padding: 15, borderRadius: 8, marginBottom: 15, fontSize: 16 },
  btn: { backgroundColor: '#0B4F8A', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statusText: { marginTop: 15, textAlign: 'center', color: '#4b5563', fontSize: 14, fontStyle: 'italic' }
});
