import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IncidentRepository } from '../../../core/database/repositories/IncidentRepository';
import { useIsFocused } from '@react-navigation/native';
import useAuthStore from '../../../store/useAuthStore';

export default function DashboardScreen({ navigation }: any) {
  const [stats, setStats] = useState({ pending: 0, sent: 0, failed: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const { user } = useAuthStore();

  const loadStats = async () => {
    try {
      const pending = await IncidentRepository.getBySyncStatus('PENDING');
      const sent = await IncidentRepository.getBySyncStatus('SENT');
      const failed = await IncidentRepository.getBySyncStatus('FAILED');
      setStats({
        pending: pending.length,
        sent: sent.length,
        failed: failed.length
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadStats();
    }
  }, [isFocused]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const navigateToList = (status: string, title: string) => {
    navigation.navigate('IncidentsList', { status, title });
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Bonjour, {user?.name || 'Utilisateur'}</Text>
        <Text style={styles.subtitle}>{user?.organization || ''}</Text>
        <Text style={[styles.subtitle, { marginTop: 15, fontSize: 14 }]}>Voici un résumé de vos incidents</Text>
      </View>

      <View style={styles.statsContainer}>
        {/* En attente */}
        <TouchableOpacity style={[styles.statCard, { borderLeftColor: '#f59e0b' }]} onPress={() => navigateToList('PENDING', 'En attente')}>
          <View style={styles.iconContainer}>
            <Ionicons name="time-outline" size={32} color="#f59e0b" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>En attente</Text>
          </View>
        </TouchableOpacity>

        {/* Envoyés */}
        <TouchableOpacity style={[styles.statCard, { borderLeftColor: '#10b981' }]} onPress={() => navigateToList('SENT', 'Envoyés')}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#10b981" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statValue}>{stats.sent}</Text>
            <Text style={styles.statLabel}>Synchronisés</Text>
          </View>
        </TouchableOpacity>

        {/* Échecs */}
        <TouchableOpacity style={[styles.statCard, { borderLeftColor: '#ef4444' }]} onPress={() => navigateToList('FAILED', 'Échecs')}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning-outline" size={32} color="#ef4444" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statValue}>{stats.failed}</Text>
            <Text style={styles.statLabel}>Échecs d'envoi</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { padding: 25, backgroundColor: '#0B4F8A', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 16, color: '#e5e7eb', marginTop: 5 },
  statsContainer: { padding: 20, marginTop: -15 },
  statCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 12, 
    marginBottom: 15, 
    alignItems: 'center', 
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }
  },
  iconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  statInfo: { marginLeft: 20 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 14, color: '#6b7280' }
});
