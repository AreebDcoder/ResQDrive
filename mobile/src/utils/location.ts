import * as Location from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

/**
 * Safely acquires the device GPS location without hanging or throwing errors.
 * Uses getLastKnownPositionAsync as an immediate fallback if getCurrentPositionAsync
 * times out or fails (e.g. indoors or slow GPS provider).
 */
export async function getSafeDeviceLocation(): Promise<LocationCoords | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    let perm = status;
    if (perm !== 'granted') {
      const req = await Location.requestForegroundPermissionsAsync();
      perm = req.status;
    }
    if (perm !== 'granted') {
      return { latitude: 33.6844, longitude: 73.0479 };
    }

    // 1. Instant check: If last known position is fresh, return immediately (0ms latency!)
    try {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown?.coords) {
        return {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
      }
    } catch (_) {}

    // 2. Fast 2-second race for current position
    try {
      const currentPos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (currentPos?.coords) {
        return {
          latitude: currentPos.coords.latitude,
          longitude: currentPos.coords.longitude,
        };
      }
    } catch (_) {}
  } catch (err) {
    console.warn('❌ [Location] Error fetching device location:', err);
  }

  // Safe fallback to Islamabad coordinates
  return { latitude: 33.6844, longitude: 73.0479 };
}

/**
 * Reverse geocodes coordinates to a human-readable address.
 */
export async function getAddressFromCoords(lat: number, lng: number): Promise<string | null> {
  try {
    const [result] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (result) {
      const parts = [
        result.name || result.streetNumber,
        result.street,
        result.subregion || result.city || result.district,
        result.region,
      ].filter(Boolean);
      return parts.join(', ');
    }
  } catch (e) {
  }
  return null;
}
