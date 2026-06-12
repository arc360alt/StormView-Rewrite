/* stormcastapi Radar API — mirrors the RainViewer v2 API structure exactly */

const API_BASE = 'https://stormcastapi.arc360hub.com/public/weather-maps.json';

/**
 * Fetches available radar frames from the stormcastapi API.
 * Returns a normalized array of frame objects sorted oldest→newest.
 * Each frame: { time, path, host, type: 'past'|'nowcast' }
 */
export async function fetchRadarFrames(signal) {
  const res = await fetch(API_BASE, { cache: 'no-cache', signal });
  if (!res.ok) throw new Error(`stormcastapi API error: ${res.status}`);
  const data = await res.json();

  const host = data.host ?? 'https://stormcastapi.arc360hub.com';
  const frames = [];

  if (data.radar?.past) {
    for (const f of data.radar.past) {
      frames.push({ time: f.time, path: f.path, host, type: 'past' });
    }
  }

  if (data.radar?.nowcast) {
    for (const f of data.radar.nowcast) {
      frames.push({ time: f.time, path: f.path, host, type: 'nowcast' });
    }
  }

  frames.sort((a, b) => a.time - b.time);
  return frames;
}

/**
 * Builds the tile URL for a given radar frame.
 * size: 256 or 512
 * colorScheme: 0-8
 * smooth: 1 (enabled) or 0
 * snow: 1 (show snow colors) or 0
 */
export function getRadarTileUrl({ host, path, size = 256, colorScheme = 7, smooth = 1, snow = 1 }) {
  return `${host}${path}/${size}/{z}/{x}/{y}/${colorScheme}/${smooth}_${snow}.png`;
}

/**
 * Returns a human-readable label for a radar frame timestamp.
 */
export function getFrameLabel(timestamp) {
  const d = new Date(timestamp * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
