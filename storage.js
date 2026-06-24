import AsyncStorage from '@react-native-async-storage/async-storage';

// Key under which the list of photos is persisted on the device.
const STORAGE_KEY = '@photo_gallery_v1';

// Load every saved photo. Returns [] if nothing has been stored yet.
export async function loadPhotos() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('loadPhotos failed', e);
    return [];
  }
}

// Persist the full list of photos (called after add / delete / update).
export async function savePhotos(photos) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  } catch (e) {
    console.warn('savePhotos failed', e);
  }
}
