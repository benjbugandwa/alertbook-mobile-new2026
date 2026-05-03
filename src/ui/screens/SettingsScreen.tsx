import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import useSettingsStore from '../../store/useSettingsStore';
import { getDb } from '../../core/database/db';
import * as SecureStore from 'expo-secure-store';
import useAuthStore from '../../store/useAuthStore';
import { Alert, TouchableOpacity } from 'react-native';

export default function SettingsScreen() {
  const [provinces, setProvinces] = useState<any[]>([]);
  const { defaultProvinceCode, setDefaultProvinceCode } = useSettingsStore();
  const { user } = useAuthStore();

  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const db = getDb();
        const data = await db.getAllAsync('SELECT * FROM provinces ORDER BY nom_province');
        setProvinces(data);
      } catch (e) {
        console.error("Could not load provinces", e);
      }
    };
    loadProvinces();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter de l'application ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Oui, me déconnecter", 
          style: "destructive",
          onPress: async () => {
            await SecureStore.deleteItemAsync('user_token');
            useAuthStore.getState().setToken(null);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.userInfoCard}>
        <Text style={styles.userName}>{user?.name || 'Utilisateur'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.orgBadge}>
          <Text style={styles.orgText}>{user?.organization}</Text>
        </View>
      </View>

      <Text style={styles.label}>Province par défaut pour la collecte :</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={defaultProvinceCode}
          onValueChange={(itemValue) => setDefaultProvinceCode(itemValue)}
        >
          <Picker.Item label="Sélectionner une province..." value={null} />
          {provinces.map(prov => (
            <Picker.Item key={prov.code_province} label={prov.nom_province} value={prov.code_province} />
          ))}
        </Picker>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden', marginBottom: 30 },
  logoutBtn: { backgroundColor: '#ef4444', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 'auto', marginBottom: 20 },
  logoutBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  userInfoCard: { backgroundColor: '#f9fafb', padding: 20, borderRadius: 10, marginBottom: 30, borderWidth: 1, borderColor: '#e5e7eb' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  userEmail: { fontSize: 14, color: '#6b7280', marginTop: 5 },
  orgBadge: { backgroundColor: '#0B4F8A', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginTop: 10 },
  orgText: { color: 'white', fontSize: 12, fontWeight: 'bold' }
});
