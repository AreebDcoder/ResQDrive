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

function isPlusCode(text?: string | null): boolean {
  if (!text) return false;
  return /^[A-Z0-9]{2,8}\+[A-Z0-9]{2,8}/i.test(text.trim());
}

/**
 * Reverse geocodes coordinates to a clean human-readable address (e.g. "Faisal Town, Islamabad").
 * Automatically filters out Google Plus Codes (e.g. JV59+82V) and postal codes.
 */
export async function getAddressFromCoords(lat: number, lng: number): Promise<string | null> {
  // 1. Try high-precision Nominatim OSM first (returns exact Street/Road + Sector, e.g. "Street 57, Faisal Town Phase 1 - F18")
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'User-Agent': 'ResQDrive/1.0' } }
    );
    const geoData = await geoRes.json();
    if (geoData?.address) {
      const addr = geoData.address;
      const road = addr.road || addr.street || addr.amenity || addr.building;
      const suburb = addr.suburb || addr.neighbourhood || addr.city_district || addr.residential;
      const city = addr.city || addr.town || addr.state;

      const parts = [
        road && !isPlusCode(road) ? road : null,
        suburb && suburb !== road && !isPlusCode(suburb) ? suburb : null,
        city && city !== suburb && city !== road ? city : null,
      ].filter(Boolean);

      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
  } catch (e) {}

  // 2. Fallback to Expo native device geocoder
  try {
    const [result] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (result) {
      const name = result.name && !isPlusCode(result.name) ? result.name.trim() : null;
      const street = result.street && !isPlusCode(result.street) ? result.street.trim() : null;
      const area = (result.district || result.subregion || '').trim() || null;
      const city = (result.city || result.region || '').trim() || null;

      const rawParts = [
        name || street,
        area && area !== (name || street) ? area : null,
        city && city !== area && city !== (name || street) ? city : null,
      ].filter(Boolean);

      const uniqueParts: string[] = [];
      for (const p of rawParts) {
        if (p && !uniqueParts.includes(p) && !isPlusCode(p) && !/^\d{4,6}$/.test(p)) {
          uniqueParts.push(p);
        }
      }

      if (uniqueParts.length > 0) {
        return uniqueParts.join(', ');
      }
    }
  } catch (e) {}

  return null;
}
