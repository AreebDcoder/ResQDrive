export interface BoundingBox {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// Bounding box lookup table for Pakistan's major provinces/cities
export const REGION_BOUNDING_BOXES: BoundingBox[] = [
  { name: 'Islamabad', minLat: 33.4, maxLat: 33.8, minLng: 72.8, maxLng: 73.3 },
  { name: 'Punjab', minLat: 27.7, maxLat: 34.0, minLng: 69.3, maxLng: 75.4 },
  { name: 'Karachi', minLat: 24.7, maxLat: 25.1, minLng: 66.9, maxLng: 67.5 },
  { name: 'Khyber Pakhtunkhwa', minLat: 31.0, maxLat: 36.9, minLng: 69.3, maxLng: 74.1 },
];

/**
 * Derives the region name offline from GPS coordinates.
 */
export function lookupRegionOffline(lat: number, lng: number): string {
  for (const box of REGION_BOUNDING_BOXES) {
    if (lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng) {
      if (box.name === 'Islamabad' || box.name === 'Punjab') {
        return 'Punjab / Islamabad';
      }
      return box.name;
    }
  }
  return 'Punjab / Islamabad'; // Fallback
}
