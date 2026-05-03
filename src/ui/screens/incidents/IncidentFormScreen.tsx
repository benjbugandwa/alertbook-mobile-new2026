import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { getDb } from '../../../core/database/db';
import { IncidentRepository } from '../../../core/database/repositories/IncidentRepository';
import useSettingsStore from '../../../store/useSettingsStore';

export default function IncidentFormScreen({ navigation }: any) {
  // États des listes déroulantes
  const [provinces, setProvinces] = useState<any[]>([]);
  const [territoires, setTerritoires] = useState<any[]>([]);
  const [chefferies, setChefferies] = useState<any[]>([]);
  const [groupements, setGroupements] = useState<any[]>([]);
  const [zonesantes, setZonesantes] = useState<any[]>([]);
  const [airesantes, setAiresantes] = useState<any[]>([]);
  const [evenements, setEvenements] = useState<any[]>([]);

  // Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Valeurs du formulaire
  const { defaultProvinceCode } = useSettingsStore();
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [form, setForm] = useState({
    code_evenement: null,
    severite: 'Moyenne',
    auteur_presume: '',
    code_province: defaultProvinceCode,
    code_territoire: null,
    code_chefferie: null,
    code_groupement: null,
    code_zonesante: null,
    code_airesante: null,
    localite: '',
    description_faits: '',
    source_info: '',
    photo_url: '',
    longitude: null as number | null,
    latitude: null as number | null,
    created_at: new Date(),
  });

  // Chargement initial (Provinces & Evénements)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const db = getDb();
        const provs = await db.getAllAsync('SELECT * FROM provinces ORDER BY nom_province');
        const evts = await db.getAllAsync('SELECT * FROM evenements ORDER BY nom_evenement');
        setProvinces(provs);
        setEvenements(evts);
        
        if (defaultProvinceCode) {
            loadTerritoires(defaultProvinceCode);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadInitialData();
  }, []);

  // Dépendances Territoire <- Province
  const loadTerritoires = async (provCode: string) => {
    const db = getDb();
    const data = await db.getAllAsync('SELECT * FROM territoires WHERE code_province = ? ORDER BY nom_territoire', [provCode]);
    setTerritoires(data);
  };

  // Dépendances Chefferies & Zones de santé <- Territoire
  const loadChefferiesAndZones = async (terrCode: string) => {
    const db = getDb();
    const chefs = await db.getAllAsync('SELECT * FROM chefferies WHERE code_territoire = ? ORDER BY nom_chefferie', [terrCode]);
    const zones = await db.getAllAsync('SELECT * FROM zonesantes WHERE code_territoire = ? ORDER BY nom_zonesante', [terrCode]);
    setChefferies(chefs);
    setZonesantes(zones);
  };

  // Dépendances Groupements <- Chefferie
  const loadGroupements = async (chefCode: string) => {
    const db = getDb();
    const grps = await db.getAllAsync('SELECT * FROM groupements WHERE code_chefferie = ? ORDER BY nom_groupement', [chefCode]);
    setGroupements(grps);
  };

  // Dépendances Aires de santé <- Zone de santé
  const loadAiresantes = async (zoneCode: string) => {
    const db = getDb();
    const aires = await db.getAllAsync('SELECT * FROM airesantes WHERE code_zonesante = ? ORDER BY nom_airesante', [zoneCode]);
    setAiresantes(aires);
  };

  const handleFieldChange = (field: string, value: any) => {
    setForm(prev => {
      const newForm = { ...prev, [field]: value };
      
      // Cascade reset
      if (field === 'code_province') {
        loadTerritoires(value);
        newForm.code_territoire = null; newForm.code_chefferie = null; newForm.code_groupement = null;
        newForm.code_zonesante = null; newForm.code_airesante = null;
      }
      if (field === 'code_territoire') {
        loadChefferiesAndZones(value);
        newForm.code_chefferie = null; newForm.code_groupement = null;
        newForm.code_zonesante = null; newForm.code_airesante = null;
      }
      if (field === 'code_chefferie') {
        loadGroupements(value);
        newForm.code_groupement = null;
      }
      if (field === 'code_zonesante') {
        loadAiresantes(value);
        newForm.code_airesante = null;
      }

      return newForm;
    });
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.1 });
    if (photo && photo.base64) {
      setForm({ ...form, photo_url: `data:image/jpeg;base64,${photo.base64}` });
    }
    setIsCameraOpen(false);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.1,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const base64 = result.assets[0].base64;
      setForm({ ...form, photo_url: `data:image/jpeg;base64,${base64}` });
    }
  };

  const handleSave = async () => {
    if (!form.description_faits || form.description_faits.trim() === '') {
      return Alert.alert('Erreur', 'La description des faits est obligatoire.');
    }

    setIsSaving(true);
    try {
      // 1. Capture du GPS
      const { status } = await Location.requestForegroundPermissionsAsync();
      let coords = { longitude: null as number|null, latitude: null as number|null };
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords = { longitude: location.coords.longitude, latitude: location.coords.latitude };
      }

      // 2. Enregistrement en base locale
      await IncidentRepository.create({
        ...form,
        created_at: form.created_at.toISOString(),
        longitude: coords.longitude,
        latitude: coords.latitude,
      });

      Alert.alert('Succès', 'Incident sauvegardé hors-ligne avec succès !', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'incident.');
    } finally {
      setIsSaving(false);
    }
  };

  // Vue Caméra Plein Écran
  if (isCameraOpen) {
    if (!cameraPermission?.granted) {
      return (
        <View style={styles.cameraContainer}>
          <Text style={{textAlign:'center', marginBottom:20}}>Nous avons besoin de votre permission pour utiliser la caméra.</Text>
          <TouchableOpacity style={styles.btn} onPress={requestCameraPermission}><Text style={styles.btnText}>Accorder la permission</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, {backgroundColor:'red', marginTop:10}]} onPress={() => setIsCameraOpen(false)}><Text style={styles.btnText}>Annuler</Text></TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing="back" ref={cameraRef}>
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
              <Text style={styles.captureText}>Capturer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelCameraBtn} onPress={() => setIsCameraOpen(false)}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>Nouvel Incident</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Date de l'incident *</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text>{form.created_at.toLocaleDateString()}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={form.created_at}
            mode="date"
            display="default"
            maximumDate={new Date()} // Empêche les dates futures
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                handleFieldChange('created_at', selectedDate);
              }
            }}
          />
        )}

        <Text style={styles.label}>Événement</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={form.code_evenement} onValueChange={(val) => handleFieldChange('code_evenement', val)}>
            <Picker.Item label="Sélectionnez..." value={null} />
            {evenements.map(e => <Picker.Item key={e.code_evenement} label={e.nom_evenement} value={e.code_evenement} />)}
          </Picker>
        </View>

        <Text style={styles.label}>Sévérité</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={form.severite} onValueChange={(val) => handleFieldChange('severite', val)}>
            <Picker.Item label="Faible" value="Faible" />
            <Picker.Item label="Moyenne" value="Moyenne" />
            <Picker.Item label="Élevée" value="Élevée" />
            <Picker.Item label="Critique" value="Critique" />
          </Picker>
        </View>

        <Text style={styles.label}>Auteur présumé</Text>
        <TextInput style={styles.input} value={form.auteur_presume} onChangeText={(val) => handleFieldChange('auteur_presume', val)} placeholder="Optionnel" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Localisation</Text>
        <Text style={styles.label}>Province</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={form.code_province} onValueChange={(val) => handleFieldChange('code_province', val)}>
            <Picker.Item label="Sélectionnez..." value={null} />
            {provinces.map(p => <Picker.Item key={p.code_province} label={p.nom_province} value={p.code_province} />)}
          </Picker>
        </View>

        <Text style={styles.label}>Territoire</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={form.code_territoire} onValueChange={(val) => handleFieldChange('code_territoire', val)} enabled={territoires.length > 0}>
            <Picker.Item label="Sélectionnez..." value={null} />
            {territoires.map(t => <Picker.Item key={t.code_territoire} label={t.nom_territoire} value={t.code_territoire} />)}
          </Picker>
        </View>

        <Text style={styles.label}>Zone de Santé</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={form.code_zonesante} onValueChange={(val) => handleFieldChange('code_zonesante', val)} enabled={zonesantes.length > 0}>
            <Picker.Item label="Sélectionnez..." value={null} />
            {zonesantes.map(z => <Picker.Item key={z.code_zonesante} label={z.nom_zonesante} value={z.code_zonesante} />)}
          </Picker>
        </View>

        <Text style={styles.label}>Aire de Santé</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={form.code_airesante} onValueChange={(val) => handleFieldChange('code_airesante', val)} enabled={airesantes.length > 0}>
            <Picker.Item label="Sélectionnez..." value={null} />
            {airesantes.map(a => <Picker.Item key={a.code_airesante} label={a.nom_airesante} value={a.code_airesante} />)}
          </Picker>
        </View>

        <Text style={styles.label}>Chefferie</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={form.code_chefferie} onValueChange={(val) => handleFieldChange('code_chefferie', val)} enabled={chefferies.length > 0}>
            <Picker.Item label="Sélectionnez..." value={null} />
            {chefferies.map(c => <Picker.Item key={c.code_chefferie} label={c.nom_chefferie} value={c.code_chefferie} />)}
          </Picker>
        </View>

        <Text style={styles.label}>Groupement</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={form.code_groupement} onValueChange={(val) => handleFieldChange('code_groupement', val)} enabled={groupements.length > 0}>
            <Picker.Item label="Sélectionnez..." value={null} />
            {groupements.map(g => <Picker.Item key={g.code_groupement} label={g.nom_groupement} value={g.code_groupement} />)}
          </Picker>
        </View>

        <Text style={styles.label}>Localité / Adresse précise</Text>
        <TextInput style={styles.input} value={form.localite} onChangeText={(val) => handleFieldChange('localite', val)} placeholder="Optionnel" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Détails</Text>
        <Text style={styles.label}>Source de l'information</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={form.source_info} onValueChange={(val) => handleFieldChange('source_info', val)}>
            <Picker.Item label="Sélectionnez..." value={null} />
            <Picker.Item label="Population locale" value="Population locale" />
            <Picker.Item label="Humanitaires" value="Humanitaires" />
            <Picker.Item label="Autorités administratives" value="Autorités administratives" />
            <Picker.Item label="Société civile" value="Société civile" />
            <Picker.Item label="Autres" value="Autres" />
          </Picker>
        </View>

        <Text style={styles.label}>Description des faits *</Text>
        <TextInput 
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
          value={form.description_faits} 
          onChangeText={(val) => handleFieldChange('description_faits', val)} 
          placeholder="Décrivez l'incident..." 
          multiline 
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Média</Text>
        {form.photo_url ? (
          <View style={{alignItems: 'center'}}>
            <Image source={{ uri: form.photo_url }} style={styles.previewImage} />
            <TouchableOpacity style={[styles.btn, {backgroundColor: '#e74c3c', marginTop: 10}]} onPress={() => handleFieldChange('photo_url', '')}>
              <Text style={styles.btnText}>Supprimer la photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity style={[styles.btn, {backgroundColor: '#34495e', flex: 1, marginRight: 5}]} onPress={() => setIsCameraOpen(true)}>
              <Text style={styles.btnText}>📸 Prendre photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, {backgroundColor: '#16a085', flex: 1, marginLeft: 5}]} onPress={pickImage}>
              <Text style={styles.btnText}>🖼️ Galerie</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity style={[styles.saveBtn, isSaving && {backgroundColor:'#95a5a6'}]} onPress={handleSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>💾 Sauvegarder (GPS auto)</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', padding: 15 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#0B4F8A', marginBottom: 20 },
  section: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#ecf0f1', paddingBottom: 5 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#34495e', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, padding: 10, marginBottom: 15, backgroundColor: '#fafafa' },
  pickerContainer: { borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, marginBottom: 15, overflow: 'hidden', backgroundColor: '#fafafa' },
  btn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#27ae60', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  previewImage: { width: '100%', height: 200, borderRadius: 10, resizeMode: 'cover' },
  
  // Camera Styles
  cameraContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'black' },
  camera: { flex: 1 },
  cameraControls: { position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  captureBtn: { backgroundColor: '#fff', width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  captureText: { color: '#000', fontWeight: 'bold' },
  cancelCameraBtn: { backgroundColor: 'red', padding: 15, borderRadius: 8 },
  cancelText: { color: '#fff', fontWeight: 'bold' }
});
