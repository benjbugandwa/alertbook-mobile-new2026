import axios from 'axios';
import { getDb } from '../database/db';
import { API_URL } from '../config';

export class ReferenceDataSync {
  static async syncAll(token: string) {
    try {
      const response = await axios.get(`${API_URL}/sync/reference-data`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const data = response.data;
      const db = getDb();

      // On supprime les anciennes données et on insère les nouvelles
      // L'API expo-sqlite actuelle gère bien l'asynchrone

      // Provinces
      if (data.provinces) {
        await db.execAsync('DELETE FROM provinces');
        for (const p of data.provinces) {
          await db.runAsync('INSERT INTO provinces (code_province, nom_province) VALUES (?, ?)', [p.code_province, p.nom_province]);
        }
      }

      // Territoires
      if (data.territoires) {
        await db.execAsync('DELETE FROM territoires');
        for (const t of data.territoires) {
          await db.runAsync('INSERT INTO territoires (code_territoire, nom_territoire, code_province) VALUES (?, ?, ?)', [t.code_territoire, t.nom_territoire, t.code_province]);
        }
      }

      // Chefferies
      if (data.chefferies) {
        await db.execAsync('DELETE FROM chefferies');
        for (const c of data.chefferies) {
          await db.runAsync('INSERT INTO chefferies (code_chefferie, nom_chefferie, code_territoire) VALUES (?, ?, ?)', [c.code_chefferie, c.nom_chefferie, c.code_territoire]);
        }
      }

      // Groupements
      if (data.groupements) {
        await db.execAsync('DELETE FROM groupements');
        for (const g of data.groupements) {
          await db.runAsync('INSERT INTO groupements (code_groupement, nom_groupement, code_chefferie) VALUES (?, ?, ?)', [g.code_groupement, g.nom_groupement, g.code_chefferie]);
        }
      }

      // Zones de santé
      if (data.zonesantes) {
        await db.execAsync('DELETE FROM zonesantes');
        for (const z of data.zonesantes) {
          await db.runAsync('INSERT INTO zonesantes (code_zonesante, nom_zonesante, code_territoire) VALUES (?, ?, ?)', [z.code_zonesante, z.nom_zonesante, z.code_territoire]);
        }
      }

      // Aires de santé
      if (data.airesantes) {
        await db.execAsync('DELETE FROM airesantes');
        for (const a of data.airesantes) {
          await db.runAsync('INSERT INTO airesantes (code_airesante, nom_airesante, code_zonesante) VALUES (?, ?, ?)', [a.code_airesante, a.nom_airesante, a.code_zonesante]);
        }
      }

      // Evenements
      if (data.evenements) {
        await db.execAsync('DELETE FROM evenements');
        for (const e of data.evenements) {
          await db.runAsync('INSERT INTO evenements (code_evenement, nom_evenement) VALUES (?, ?)', [e.code_evenement, e.nom_evenement]);
        }
      }

      return true;
    } catch (error) {
      console.error("Erreur lors de la synchronisation des données de référence", error);
      throw error;
    }
  }
}
