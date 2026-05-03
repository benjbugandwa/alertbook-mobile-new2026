import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('alertbook.db');
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT, token TEXT);
    
    CREATE TABLE IF NOT EXISTS provinces (code_province TEXT PRIMARY KEY, nom_province TEXT);
    CREATE TABLE IF NOT EXISTS territoires (code_territoire TEXT PRIMARY KEY, nom_territoire TEXT, code_province TEXT);
    CREATE TABLE IF NOT EXISTS chefferies (code_chefferie TEXT PRIMARY KEY, nom_chefferie TEXT, code_territoire TEXT);
    CREATE TABLE IF NOT EXISTS groupements (code_groupement TEXT PRIMARY KEY, nom_groupement TEXT, code_chefferie TEXT);
    CREATE TABLE IF NOT EXISTS zonesantes (code_zonesante TEXT PRIMARY KEY, nom_zonesante TEXT, code_territoire TEXT);
    CREATE TABLE IF NOT EXISTS airesantes (code_airesante TEXT PRIMARY KEY, nom_airesante TEXT, code_zonesante TEXT);
    CREATE TABLE IF NOT EXISTS evenements (code_evenement TEXT PRIMARY KEY, nom_evenement TEXT);
    
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      code_incident TEXT UNIQUE,
      created_by INTEGER,
      severite TEXT,
      statut_incident TEXT DEFAULT 'En attente',
      auteur_presume TEXT,
      code_province TEXT,
      code_territoire TEXT,
      code_chefferie TEXT,
      code_groupement TEXT,
      code_zonesante TEXT,
      code_airesante TEXT,
      localite TEXT,
      description_faits TEXT,
      source_info TEXT,
      longitude REAL,
      latitude REAL,
      code_evenement TEXT,
      photo_url TEXT,
      created_at TEXT,
      sync_status TEXT DEFAULT 'PENDING'
    );
  `);
  
  return db;
};

export const getDb = () => {
  if (!db) throw new Error("Database not initialized");
  return db;
};
