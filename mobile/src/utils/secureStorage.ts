import { Platform } from 'react-native';

type SecureStorageValue = string | null;

const isWeb = Platform.OS === 'web';

export async function getItemAsync(key: string): Promise<SecureStorageValue> {
  if (isWeb) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // localStorage may be full or disabled — fail silently
    }
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // fail silently
    }
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(key);
}