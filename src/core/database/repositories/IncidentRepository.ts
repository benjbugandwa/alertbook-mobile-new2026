import 'react-native-get-random-values';
import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';

export class IncidentRepository {
  static async generateCode(): Promise<string> {
    const db = getDb();
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM incidents');
    const nextNumber = (result?.count || 0) + 1;
    return `ALT-${nextNumber.toString().padStart(6, '0')}`;
  }

  static async create(incidentData: any) {
    const db = getDb();
    const id = uuidv4();
    const code = await this.generateCode();
    
    await db.runAsync(
      `INSERT INTO incidents (
        id, code_incident, severite, auteur_presume, code_province, code_territoire, 
        code_chefferie, code_groupement, code_zonesante, code_airesante, localite, 
        description_faits, source_info, longitude, latitude, code_evenement, 
        photo_url, created_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        id, code, incidentData.severite, incidentData.auteur_presume, incidentData.code_province,
        incidentData.code_territoire, incidentData.code_chefferie, incidentData.code_groupement,
        incidentData.code_zonesante, incidentData.code_airesante, incidentData.localite,
        incidentData.description_faits, incidentData.source_info, incidentData.longitude,
        incidentData.latitude, incidentData.code_evenement, incidentData.photo_url, 
        incidentData.created_at || new Date().toISOString()
      ]
    );
    return code;
  }

  static async getBySyncStatus(status: 'PENDING' | 'SENT' | 'FAILED') {
    const db = getDb();
    return await db.getAllAsync<any>('SELECT * FROM incidents WHERE sync_status = ? ORDER BY created_at DESC', [status]);
  }

  static async updateSyncStatus(ids: string[], newStatus: 'PENDING' | 'SENT' | 'FAILED') {
    if (ids.length === 0) return;
    const db = getDb();
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(`UPDATE incidents SET sync_status = ? WHERE id IN (${placeholders})`, [newStatus, ...ids]);
  }
}
