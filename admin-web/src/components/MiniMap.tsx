import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LeafletTooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink } from 'lucide-react';
import type { AnalyticsHotspot } from '../types';

/**
 * MiniMap — Leaflet map showing incident hotspots.
 *
 * Uses OpenStreetMap tiles (free, no API key required).
 *
 * Hotspots are drawn as CircleMarkers with radius scaled by incidentCount.
 * Clicking a marker shows a popup with details + link to Google Maps.
 *
 * The map is sized to fill its parent — caller controls height via
 * container's CSS.
 *
 * Note: react-leaflet v4 requires React 18+. We use 4.2.1 here.
 */

interface MiniMapProps {
  hotspots: AnalyticsHotspot[];
  /** Map height in pixels (default 320) */
  height?: number;
}

// Fix default marker icon path issue with bundlers (we use CircleMarker so no icons needed,
// but call to ensure leaflet CSS variables are set)
void L;

export function MiniMap({ hotspots, height = 320 }: MiniMapProps) {
  // Compute a reasonable center + bounds from hotspots (fall back to a default location)
  const center = useMemo<[number, number]>(() => {
    if (hotspots.length === 0) return [33.6844, 73.0479]; // Islamabad (project default)
    const top = hotspots[0];
    return [top.latitude, top.longitude];
  }, [hotspots]);

  const maxCount = useMemo(
    () => hotspots.reduce((max, h) => Math.max(max, h.incidentCount), 1),
    [hotspots],
  );

  if (hotspots.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400"
        style={{ height }}
      >
        No geotagged incidents to display on the map.
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {hotspots.map((h, i) => {
          const radius = 8 + Math.round((h.incidentCount / maxCount) * 18);
          return (
            <CircleMarker
              key={i}
              center={[h.latitude, h.longitude]}
              radius={radius}
              pathOptions={{
                color: '#dc2626',
                fillColor: '#ef4444',
                fillOpacity: 0.5,
                weight: 2,
              }}
            >
              <LeafletTooltip>
                <div className="text-xs">
                  <strong>{h.incidentCount} incidents</strong>
                  {h.sampleAddresses.length > 0 && (
                    <div className="mt-1 text-gray-700">{h.sampleAddresses[0]}</div>
                  )}
                </div>
              </LeafletTooltip>
              <Popup>
                <div className="text-xs">
                  <p className="mb-1 font-semibold text-gray-900">
                    {h.incidentCount} incidents
                  </p>
                  <p className="text-gray-600">
                    {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
                  </p>
                  {h.sampleAddresses.length > 0 && (
                    <p className="mt-1 text-gray-700">{h.sampleAddresses.join(', ')}</p>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
                  >
                    Open in Maps <ExternalLink size={11} />
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
