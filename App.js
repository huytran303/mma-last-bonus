import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { loadPhotos, savePhotos } from './storage';
import { generateDescription } from './gemini';
import MapPreview from './MapPreview';

const { width } = Dimensions.get('window');
const GAP = 8;
const COLS = 2;
const TILE = (width - GAP * (COLS + 1)) / COLS;

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null); // photo open in detail modal

  // ---- Load persisted photos once on startup (AsyncStorage) ----
  useEffect(() => {
    (async () => {
      setPhotos(await loadPhotos());
      setReady(true);
    })();
  }, []);

  // Persist + update state in one place so storage never drifts from UI.
  const persist = useCallback(async (next) => {
    setPhotos(next);
    await savePhotos(next);
  }, []);

  // ---- Capture a photo, grab GPS, ask Gemini for a description ----
  const takePhoto = async () => {
    // 1. Camera permission + capture (image picker)
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      Alert.alert('Cần quyền', 'Vui lòng cấp quyền camera để chụp ảnh.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];

    setBusy(true);
    try {
      // 2. Current location (best-effort — photo still saves without it)
      let coords = null, address = null;
      try {
        const loc = await Location.requestForegroundPermissionsAsync();
        if (loc.granted) {
          const pos = await Location.getCurrentPositionAsync({});
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const geo = await Location.reverseGeocodeAsync(pos.coords);
          if (geo[0]) {
            const g = geo[0];
            address = [g.name, g.street, g.city, g.region, g.country]
              .filter(Boolean)
              .join(', ');
          }
        }
      } catch (e) {
        console.warn('location failed', e);
      }

      // 3. Gemini description (best-effort)
      let description = '';
      try {
        description = await generateDescription(asset.base64, 'image/jpeg');
      } catch (e) {
        description = `⚠️ Không tạo được mô tả: ${e.message}`;
      }

      const photo = {
        id: `${Date.now()}`,
        uri: asset.uri,
        base64: asset.base64,
        mimeType: 'image/jpeg',
        coords,
        address,
        description,
        createdAt: new Date().toISOString(),
      };
      await persist([photo, ...photos]);
    } finally {
      setBusy(false);
    }
  };

  // ---- Re-run Gemini for an already-saved photo ----
  const regenerate = async (photo) => {
    setBusy(true);
    try {
      const description = await generateDescription(photo.base64, photo.mimeType);
      const next = photos.map((p) =>
        p.id === photo.id ? { ...p, description } : p
      );
      await persist(next);
      setSelected((s) => (s && s.id === photo.id ? { ...s, description } : s));
    } catch (e) {
      Alert.alert('Lỗi Gemini', e.message);
    } finally {
      setBusy(false);
    }
  };

  // ---- Delete a photo (with confirm) ----
  const remove = (photo) => {
    Alert.alert('Xoá ảnh', 'Bạn có chắc muốn xoá ảnh này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          await persist(photos.filter((p) => p.id !== photo.id));
          setSelected(null);
        },
      },
    ]);
  };

  const renderTile = ({ item }) => (
    <TouchableOpacity style={styles.tile} onPress={() => setSelected(item)}>
      <Image source={{ uri: item.uri }} style={styles.tileImg} />
      {item.coords && (
        <View style={styles.tileBadge}>
          <Ionicons name="location" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>📸 Photo Journal</Text>
        <Text style={styles.subtitle}>{photos.length} ảnh đã lưu</Text>
      </View>

      {photos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={64} color="#cbd5e1" />
          <Text style={styles.empty}>Chưa có ảnh nào.{'\n'}Nhấn nút máy ảnh để bắt đầu.</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(p) => p.id}
          renderItem={renderTile}
          numColumns={COLS}
          contentContainerStyle={{ padding: GAP }}
          columnWrapperStyle={{ gap: GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        />
      )}

      {/* Floating capture button (image picker) */}
      <TouchableOpacity style={styles.fab} onPress={takePhoto} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons name="camera" size={28} color="#fff" />
        )}
      </TouchableOpacity>

      {/* ---- Detail modal: image + map + description + delete ---- */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={styles.modal}>
            <View style={styles.modalBar}>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="chevron-down" size={28} color="#0f172a" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Chi tiết ảnh</Text>
              <TouchableOpacity onPress={() => remove(selected)}>
                <Ionicons name="trash" size={24} color="#dc2626" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              <Image source={{ uri: selected.uri }} style={styles.detailImg} />

              <View style={styles.section}>
                <Text style={styles.label}>🤖 Mô tả từ Gemini AI</Text>
                <Text style={styles.desc}>{selected.description || 'Chưa có mô tả.'}</Text>
                <TouchableOpacity
                  style={styles.regenBtn}
                  onPress={() => regenerate(selected)}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color="#2563eb" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color="#2563eb" />
                      <Text style={styles.regenText}>Tạo lại mô tả</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>📍 Vị trí chụp</Text>
                {selected.coords ? (
                  <>
                    {selected.address ? (
                      <Text style={styles.addr}>{selected.address}</Text>
                    ) : null}
                    <MapPreview coords={selected.coords} address={selected.address} />
                    <Text style={styles.coordText}>
                      {selected.coords.lat.toFixed(5)}, {selected.coords.lng.toFixed(5)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.addr}>Không có dữ liệu vị trí cho ảnh này.</Text>
                )}
              </View>

              <Text style={styles.time}>
                Chụp lúc: {new Date(selected.createdAt).toLocaleString()}
              </Text>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#2563eb',
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#dbeafe', fontSize: 13, marginTop: 2 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 12, fontSize: 15 },

  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  tileImg: { width: '100%', height: '100%' },
  tileBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(37,99,235,0.9)',
    borderRadius: 10,
    padding: 4,
  },

  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  modal: { flex: 1, backgroundColor: '#fff' },
  modalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  detailImg: { width: '100%', height: 320, backgroundColor: '#e2e8f0' },

  section: { paddingHorizontal: 20, paddingTop: 20 },
  label: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  desc: { fontSize: 15, lineHeight: 22, color: '#334155' },
  addr: { fontSize: 14, color: '#475569', marginBottom: 10 },
  regenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  regenText: { color: '#2563eb', fontWeight: '600' },

  map: { width: '100%', height: 200, borderRadius: 14 },
  coordText: { fontSize: 12, color: '#94a3b8', marginTop: 6 },
  time: { fontSize: 12, color: '#94a3b8', paddingHorizontal: 20, paddingTop: 20 },
});
