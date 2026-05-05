import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IncidentRepository } from '../../../core/database/repositories/IncidentRepository';
import { SyncEngine } from '../../../core/sync/SyncEngine';
import useAuthStore from '../../../store/useAuthStore';
import Checkbox from 'expo-checkbox';
import { useIsFocused } from '@react-navigation/native';

export default function IncidentsListScreen({ route, navigation }: any) {
  // Par défaut, si on n'a pas de paramètres, on montre les PENDING
  const statusFilter = route.params?.status || 'PENDING';
  const title = route.params?.title || 'Alertes en attente';

  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  
  const token = useAuthStore((state) => state.token);
  const isFocused = useIsFocused();

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    if (isFocused) {
      loadIncidents();
    }
  }, [isFocused, statusFilter]);

  const loadIncidents = async () => {
    try {
      const data = await IncidentRepository.getBySyncStatus(statusFilter);
      setIncidents(data);
      // Réinitialiser la sélection au chargement
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === incidents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(incidents.map(i => i.id));
    }
  };

  const handleSync = async () => {
    if (selectedIds.length === 0) return Alert.alert('Attention', 'Sélectionnez au moins une alerte');
    
    setIsSyncing(true);
    setSyncProgress({ current: 0, total: selectedIds.length });
    
    const successCount = await SyncEngine.syncSelectedIncidents(
      selectedIds, 
      token || '', 
      (current, total) => setSyncProgress({ current, total })
    );
    setIsSyncing(false);
    
    setSelectedIds([]);
    await loadIncidents();
    Alert.alert('Résultat', `${successCount} alerte(s) sur ${selectedIds.length} ont été synchronisées avec succès.`);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment supprimer cette alerte ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive', 
          onPress: async () => {
            await IncidentRepository.deleteById(id);
            loadIncidents();
          } 
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('IncidentForm', { incident: item, mode: statusFilter === 'SENT' ? 'view' : 'edit' })}
    >
      <Checkbox 
        value={selectedIds.includes(item.id)} 
        onValueChange={() => toggleSelection(item.id)} 
        color={selectedIds.includes(item.id) ? '#0B4F8A' : undefined}
      />
      <View style={styles.cardInfo}>
        <Text style={styles.codeText}>{item.code_incident}</Text>
        <Text numberOfLines={2} style={styles.descText}>{item.description_faits || 'Aucune description'}</Text>
        <Text style={styles.dateText}>
          <Ionicons name="calendar-outline" size={12} /> {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      {/* Icône d'état */}
      {statusFilter === 'SENT' && <Ionicons name="checkmark-circle" size={24} color="#10b981" />}
      {statusFilter === 'FAILED' && (
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={{marginRight: 10}}>
            <Ionicons name="trash-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
          <Ionicons name="close-circle" size={24} color="#ef4444" />
        </View>
      )}
      {statusFilter === 'PENDING' && <Ionicons name="time" size={24} color="#f59e0b" />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.countText}>{incidents.length} alerte(s) trouvée(s)</Text>
        {incidents.length > 0 && (statusFilter === 'PENDING' || statusFilter === 'FAILED') && (
          <TouchableOpacity onPress={selectAll}>
            <Text style={styles.selectAllText}>
              {selectedIds.length === incidents.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        data={incidents}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={60} color="#cbd5e1" />
            <Text style={styles.emptyText}>Aucune alerte dans cette catégorie.</Text>
          </View>
        }
      />

      {(statusFilter === 'PENDING' || statusFilter === 'FAILED') && incidents.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.syncBtn, (isSyncing || selectedIds.length === 0) && styles.syncBtnDisabled]} 
            onPress={handleSync}
            disabled={isSyncing || selectedIds.length === 0}
          >
            {isSyncing ? (
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <ActivityIndicator color="#fff" />
                <Text style={[styles.syncBtnText, {marginLeft: 10}]}>
                  Envoi... {syncProgress.current}/{syncProgress.total} ({Math.round((syncProgress.current / syncProgress.total) * 100)}%)
                </Text>
              </View>
            ) : (
              <Text style={styles.syncBtnText}>
                <Ionicons name="cloud-upload-outline" size={18} /> Envoyer ({selectedIds.length})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  countText: { fontWeight: 'bold', color: '#4b5563' },
  selectAllText: { color: '#0B4F8A', fontWeight: '500' },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, marginHorizontal: 15, marginTop: 10, borderRadius: 10, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  cardInfo: { marginLeft: 15, flex: 1 },
  codeText: { fontWeight: 'bold', fontSize: 16, color: '#111827', marginBottom: 4 },
  descText: { fontSize: 14, color: '#4b5563', marginBottom: 6 },
  dateText: { fontSize: 12, color: '#9ca3af' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#9ca3af', marginTop: 15, fontSize: 16 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 15, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  syncBtn: { backgroundColor: '#0B4F8A', padding: 15, borderRadius: 10, alignItems: 'center' },
  syncBtnDisabled: { backgroundColor: '#9ca3af' },
  syncBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
