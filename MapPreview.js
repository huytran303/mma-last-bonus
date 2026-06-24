import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// react-native-maps fails to evaluate under some Expo Go / New Architecture
// setups (it calls UIManager.hasViewManagerConfig at import time). We guard the
// require so that, when the native map module is unavailable, the app degrades
// to an "open in Google Maps" link instead of crashing on startup.
let MapView = null;
let Marker = null;
try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
} catch (e) {
  console.warn('react-native-maps unavailable:', e && e.message);
}

export default function MapPreview({ coords, address }) {
  const url =
    `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;

  // Native map available → show it, plus a link to open the full Google Maps app.
  if (MapView && Marker) {
    return (
      <View>
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? 'google' : undefined}
          initialRegion={{
            latitude: coords.lat,
            longitude: coords.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{ latitude: coords.lat, longitude: coords.lng }}
            title="Nơi chụp ảnh"
            description={address || ''}
          />
        </MapView>
        <TouchableOpacity style={styles.link} onPress={() => Linking.openURL(url)}>
          <Ionicons name="open-outline" size={16} color="#2563eb" />
          <Text style={styles.linkText}>Mở trong Google Maps</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Fallback → open the location directly in Google Maps (browser or app).
  return (
    <TouchableOpacity style={styles.fallback} onPress={() => Linking.openURL(url)}>
      <Ionicons name="map" size={22} color="#2563eb" />
      <Text style={styles.linkText}>Xem vị trí trên Google Maps</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: 200, borderRadius: 14 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  fallback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  linkText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },
});
