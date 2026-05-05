import { IncidentRepository } from '../database/repositories/IncidentRepository';
import axios from 'axios';
import * as Location from 'expo-location';
import { API_URL } from '../config';
import useAuthStore from '../../store/useAuthStore';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';

export class SyncEngine {
  static async syncSelectedIncidents(
    incidentIds: string[], 
    token: string, 
    onProgress?: (current: number, total: number) => void
  ) {
    // 1. Get current location for all synced incidents (if not already recorded)
    let locationCoords = { longitude: 0, latitude: 0 };
    try {
      const location = await Location.getCurrentPositionAsync({});
      locationCoords = { longitude: location.coords.longitude, latitude: location.coords.latitude };
    } catch (e) {
      console.warn("Could not get location during sync", e);
    }

    // 2. Fetch pending incidents from SQLite
    const pendingIncidents = await IncidentRepository.getBySyncStatus('PENDING');
    const incidentsToSync = pendingIncidents.filter(inc => incidentIds.includes(inc.id));

    let successCount = 0;

    for (const incident of incidentsToSync) {
      try {
        // Use coordinates if not already set
        const payload = {
          ...incident,
          longitude: incident.longitude || locationCoords.longitude,
          latitude: incident.latitude || locationCoords.latitude
        };

        // Send to Laravel API
        await axios.post(`${API_URL}/incidents`, payload, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        // 3. Mark as SENT on success
        await IncidentRepository.updateSyncStatus([incident.id], 'SENT');
        successCount++;
        } catch (error: any) {
          console.error(`Erreur lors de l'envoi de l'incident ${incident.code_incident}:`, error.message);
          if (error.response) {
            console.error('Status backend:', error.response.status);
            console.error('Data backend:', JSON.stringify(error.response.data));
            
            // 4. Gestion de l'expiration du Token (401 Unauthorized)
            if (error.response.status === 401) {
              console.warn("Token expiré. Déconnexion de l'utilisateur...");
              await SecureStore.deleteItemAsync('user_token');
              useAuthStore.getState().setToken(null);
              // On arrête la boucle de synchronisation car le token est invalide
              break; 
            }
          } else if (error.request) {
            console.error('Aucune réponse du serveur (problème réseau ou timeout, vérifier l\'IP et si le serveur tourne).');
          }
          await IncidentRepository.updateSyncStatus([incident.id], 'FAILED');
        }
        
        if (onProgress) {
          onProgress(successCount, incidentsToSync.length);
        }
    }
    return successCount;
  }

  // Méthode pour la synchronisation automatique en arrière-plan
  static async autoSyncAll(token: string) {
    // Vérifier si on a une connexion
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      console.log('Pas de connexion internet. Auto-sync annulée.');
      return 0;
    }

    try {
      // On récupère tous les incidents en attente ou en échec
      const pending = await IncidentRepository.getBySyncStatus('PENDING');
      const failed = await IncidentRepository.getBySyncStatus('FAILED');
      const incidentsToSync = [...pending, ...failed].map(inc => inc.id);

      if (incidentsToSync.length > 0) {
        console.log(`Auto-sync déclenchée pour ${incidentsToSync.length} incidents...`);
        return await this.syncSelectedIncidents(incidentsToSync, token);
      }
    } catch (e) {
      console.error('Erreur lors de l\'auto-sync:', e);
    }
    return 0;
  }
}
