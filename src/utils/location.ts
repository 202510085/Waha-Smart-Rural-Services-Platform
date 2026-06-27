export const DEFAULT_LOCATION = {
  latitude: 24.2075,
  longitude: 55.7682,
  name: 'القوع - العين',
};

export interface UserLocation {
  latitude: number;
  longitude: number;
  isDefault: boolean;
  name: string;
}

export function getCurrentLocation(): Promise<UserLocation> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ...DEFAULT_LOCATION, isDefault: true, name: DEFAULT_LOCATION.name });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          isDefault: false,
          name: 'موقعك الحالي',
        });
      },
      () => {
        resolve({ ...DEFAULT_LOCATION, isDefault: true, name: DEFAULT_LOCATION.name });
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}

export function calculateDistanceKm(
  userLat: number,
  userLng: number,
  serviceLat: number,
  serviceLng: number
): number {
  const R = 6371;
  const dLat = ((serviceLat - userLat) * Math.PI) / 180;
  const dLng = ((serviceLng - userLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((serviceLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export function sortByDistance<T extends { distance: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.distance - b.distance);
}

export function openDirections(lat: number, lng: number): void {
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    '_blank',
    'noopener,noreferrer'
  );
}

export function openCall(phone: string): void {
  window.location.href = `tel:${phone}`;
}

export function normalizePhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (cleaned.startsWith('05')) {
    cleaned = '971' + cleaned.slice(1);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    cleaned = '971' + cleaned;
  } else if (cleaned.startsWith('0')) {
    cleaned = '971' + cleaned.slice(1);
  } else if (!cleaned.startsWith('971') && !cleaned.startsWith('+')) {
    cleaned = '971' + cleaned;
  }
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  return cleaned;
}

export function openWhatsApp(phone: string, message?: string): void {
  const normalized = normalizePhoneForWhatsApp(phone);
  const base = `https://wa.me/${normalized}`;
  const url = message ? `${base}?text=${encodeURIComponent(message)}` : base;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} م`;
  if (km < 10) return `${km.toFixed(1)} كم`;
  return `${Math.round(km)} كم`;
}

export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function getOpenStatus(hours: string | null): 'open' | 'closed' | 'unknown' {
  if (!hours) return 'unknown';
  const h = hours.trim();
  if (h === '24 ساعة' || h === '24/7') return 'open';
  try {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const arMatch = h.match(/(\d+(?::\d+)?)\s*(?:صباحاً|صباحا|ص)\s*[-–]\s*(\d+(?::\d+)?)\s*(?:مساءً|مساء|م|ظهراً|عصراً)/);
    if (arMatch) {
      const openH = parseFloat(arMatch[1].replace(':', '.'));
      let closeH = parseFloat(arMatch[2].replace(':', '.')) + 12;
      if (closeH > 24) closeH -= 12;
      return currentHour >= openH && currentHour < closeH ? 'open' : 'closed';
    }
    const rangeMatch = h.match(/(\d+):(\d+)\s*[-–]\s*(\d+):(\d+)/);
    if (rangeMatch) {
      const openH = parseInt(rangeMatch[1]) + parseInt(rangeMatch[2]) / 60;
      const closeH = parseInt(rangeMatch[3]) + parseInt(rangeMatch[4]) / 60;
      return currentHour >= openH && currentHour < closeH ? 'open' : 'closed';
    }
  } catch (err) {
    console.error('[location] getOpenStatus parse error:', err);
  }
  return 'unknown';
}
