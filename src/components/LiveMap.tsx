import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Search,
  Info,
  Maximize2,
  Minimize2,
  Map as MapIcon,
  Moon,
  Satellite,
  Truck,
  Users,
  Star,
  MapPin,
  Clock,
  Crosshair,
} from 'lucide-react';
import { MoveRequest, DriverProfile } from '../types';

declare global {
  interface Window {
    L: any;
  }
}

const ISRAEL_CITIES_COORDS: { [key: string]: [number, number] } = {
  'תל אביב': [32.0853, 34.7818],
  'תל-אביב': [32.0853, 34.7818],
  'ירושלים': [31.7683, 35.2137],
  'חיפה': [32.794, 34.9896],
  'באר שבע': [31.2529, 34.7915],
  'באר-שבע': [31.2529, 34.7915],
  'ראשון לציון': [31.973, 34.7925],
  'ראשון-לציון': [31.973, 34.7925],
  'פתח תקווה': [32.084, 34.8878],
  'פתח-תקווה': [32.084, 34.8878],
  'אשדוד': [31.8044, 34.6511],
  'נתניה': [32.3215, 34.8532],
  'חולון': [32.016, 34.787],
  'בני ברק': [32.08, 34.83],
  'בני-ברק': [32.08, 34.83],
  'רמת גן': [32.0684, 34.8248],
  'רמת-גן': [32.0684, 34.8248],
  'רחובות': [31.8928, 34.8113],
  'אשקלון': [31.6688, 34.5743],
  'בת ים': [32.015, 34.745],
  'בת-ים': [32.015, 34.745],
  'הרצליה': [32.1624, 34.8447],
  'כפר סבא': [32.1714, 34.9083],
  'כפר-סבא': [32.1714, 34.9083],
  'חדרה': [32.434, 34.9197],
  'רעננה': [32.1848, 34.8713],
  'מודיעין': [31.8998, 35.0074],
  'רמלה': [31.9292, 34.8656],
  'לוד': [31.9522, 34.8967],
  'גבעתיים': [32.0722, 34.8125],
  'הוד השרון': [32.1542, 34.8972],
  'קרית גת': [31.6031, 34.7638],
  'עכו': [32.9261, 35.0839],
  'כרמיאל': [32.9136, 35.2961],
  'אילת': [29.5577, 34.9519],
  'טבריה': [32.7922, 35.5312],
  'נהריה': [32.9926, 35.0933],
  'עפולה': [32.6074, 35.2897],
  'נצרת': [32.6996, 35.3035],
  'קרית שמונה': [33.2078, 35.5694],
  'בית שמש': [31.7456, 34.9867],
  'הר חברון': [31.4292, 35.0847],
  'קיסריה': [32.5186, 34.9044],
  'רעננה דרום': [32.175, 34.862],
  'נס ציונה': [31.929, 34.7983],
  'קרית מלאכי': [31.7333, 34.75],
  'שדרות': [31.5225, 34.5956],
  'נתיבות': [31.4217, 34.5878],
};

const DEFAULT_CENTER: [number, number] = [32.0853, 34.7818];

const getCityCoords = (address: string): [number, number] => {
  const normalized = (address || '').toLowerCase();
  for (const city of Object.keys(ISRAEL_CITIES_COORDS)) {
    if (normalized.includes(city.toLowerCase())) {
      return ISRAEL_CITIES_COORDS[city];
    }
  }
  return DEFAULT_CENTER;
};

const getCityName = (address: string): string => {
  const normalized = (address || '').toLowerCase();
  for (const city of Object.keys(ISRAEL_CITIES_COORDS)) {
    if (normalized.includes(city.toLowerCase())) return city.replace(/-/g, ' ');
  }
  return address?.split(',')[0] || 'מרכז';
};

// Deterministic offset so markers in the same city don't overlap
const getOffsetCoords = (id: string, baseCoords: [number, number]): [number, number] => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const offsetLat = (Math.abs(hash % 100) / 10000) - 0.005;
  const offsetLng = (Math.abs((hash >> 8) % 100) / 10000) - 0.005;
  return [baseCoords[0] + offsetLat, baseCoords[1] + offsetLng];
};

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toInternationalPhone = (phone: string): string => {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.slice(1)}`;
  return digits;
};

const formatLastSeen = (iso?: string): string => {
  if (!iso) return 'לא ידוע';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return 'לא ידוע';
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `לפני ${minutes} דק׳`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  return new Date(iso).toLocaleDateString('he-IL');
};

const loadLeafletCSSAndJS = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve();
      return;
    }

    if (!document.getElementById('leaflet-css-cdn')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const existing = document.getElementById('leaflet-js-cdn') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Leaflet load failed')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'leaflet-js-cdn';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Leaflet load failed'));
    document.body.appendChild(script);
  });
};

// Esri ArcGIS Online tiles: keyless, no watermark, Hebrew labels for Israel
const ESRI_BASE = 'https://server.arcgisonline.com/ArcGIS/rest/services';
type BaseLayerKey = 'streets' | 'dark' | 'satellite';

const BASE_LAYERS: Record<BaseLayerKey, { label: string; base: string; labels?: string; maxNativeZoom: number }> = {
  streets: {
    label: 'רחובות',
    base: `${ESRI_BASE}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`,
    maxNativeZoom: 19,
  },
  dark: {
    label: 'לילה',
    base: `${ESRI_BASE}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI_BASE}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
    maxNativeZoom: 16,
  },
  satellite: {
    label: 'לווין',
    base: `${ESRI_BASE}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI_BASE}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
    maxNativeZoom: 19,
  },
};

const BASE_LAYER_ICONS: Record<BaseLayerKey, React.ComponentType<{ className?: string }>> = {
  streets: MapIcon,
  dark: Moon,
  satellite: Satellite,
};

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

// Fallback fleet shown only when no registered drivers are online
const DEMO_FLEET: (DriverProfile & { lastSeenAt: string; isDemo: true })[] = [
  { id: 'fleet-demo-1', fullName: 'אבי כהן', phone: '0521234567', truckType: 'משאית סגורה 7.5 טון + רמפה הידראולית', truckPlate: '12-345-67', region: 'תל אביב', rating: 4.9, status: 'active', lastSeenAt: minutesAgo(1), isDemo: true },
  { id: 'fleet-demo-2', fullName: 'מוחמד חלבי', phone: '0547654321', truckType: 'משאית 12 טון + מנוף קבוע', truckPlate: '45-678-90', region: 'חיפה', rating: 4.8, status: 'active', lastSeenAt: minutesAgo(3), isDemo: true },
  { id: 'fleet-demo-3', fullName: 'יוסי לוי', phone: '0509876543', truckType: 'איסוזו פלטה פתוחה 5.5 טון', truckPlate: '78-901-23', region: 'ראשון לציון', rating: 4.7, status: 'active', lastSeenAt: minutesAgo(2), isDemo: true },
  { id: 'fleet-demo-4', fullName: 'דוד אברהם', phone: '0531122334', truckType: 'מסחרית גדולה 3.5 טון (ספרינטר / קרפטר)', truckPlate: '23-456-78', region: 'ירושלים', rating: 5.0, status: 'active', lastSeenAt: minutesAgo(5), isDemo: true },
  { id: 'fleet-demo-5', fullName: 'רון מזרחי', phone: '0584455667', truckType: 'טריילר פלטה מרכז / פול-טריילר', truckPlate: '56-789-01', region: 'באר שבע', rating: 4.6, status: 'active', lastSeenAt: minutesAgo(8), isDemo: true },
];

type FleetDriver = DriverProfile & { lastSeenAt?: string; lat?: number; lng?: number; isDemo?: boolean; updatedAt?: string };

const getDriverKey = (d: FleetDriver) => d.id || d.phone || d.fullName;

const getDriverCoords = (d: FleetDriver): [number, number] => {
  if (typeof d.lat === 'number' && typeof d.lng === 'number') return [d.lat, d.lng];
  return getOffsetCoords('drv_' + getDriverKey(d), getCityCoords(d.region || 'תל אביב'));
};

const renderStars = (rating: number) => {
  const full = Math.round(rating);
  return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
};

const pinIcon = (L: any, letter: 'A' | 'B', color: string) =>
  L.divIcon({
    className: 'td-marker',
    iconSize: [30, 40],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
    html: `
      <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M15 1C7.3 1 1 7.2 1 14.9 1 25.4 15 39 15 39s14-13.6 14-24.1C29 7.2 22.7 1 15 1z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
        <circle cx="15" cy="15" r="8" fill="#040d1a"/>
        <text x="15" y="19" text-anchor="middle" font-family="Heebo, sans-serif" font-size="11" font-weight="800" fill="#ffffff">${letter}</text>
      </svg>`,
  });

const truckIcon = (L: any) =>
  L.divIcon({
    className: 'td-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -18],
    html: `
      <div class="td-truck">
        <span class="td-ping td-ping-orange"></span>
        <span class="td-truck-core">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
            <path d="M15 18H9"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
            <circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>
          </svg>
        </span>
      </div>`,
  });

const driverIcon = (L: any) =>
  L.divIcon({
    className: 'td-marker',
    iconSize: [36, 46],
    iconAnchor: [18, 44],
    popupAnchor: [0, -40],
    html: `
      <div class="td-driver-pin">
        <span class="td-ping td-ping-emerald"></span>
        <svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <filter id="tdGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path filter="url(#tdGlow)" d="M18 2C9.2 2 2 9.1 2 17.9 2 29.9 18 44 18 44s16-14.1 16-26.1C34 9.1 26.8 2 18 2z" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
          <circle cx="18" cy="18" r="10" fill="#040d1a"/>
          <g transform="translate(10.5 10.5) scale(0.62)" fill="none" stroke="#10b981" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
            <path d="M15 18H9"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
            <circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>
          </g>
        </svg>
      </div>`,
  });

const buildDriverPopup = (d: FleetDriver) => {
  const phone = d.phone || '';
  const intl = toInternationalPhone(phone);
  const waText = encodeURIComponent(`שלום ${d.fullName || ''}, כאן מוקד טראק דיל IL. יש לנו הובלה בציר שלך – זמין/ה?`);
  const rating = Number(d.rating || 5).toFixed(1);
  return `
    <div class="td-pop" dir="rtl">
      <div class="td-pop-head">
        <span class="td-badge-online"><span class="td-dot"></span>Online 🟢</span>
        <span class="td-pop-rating">★ ${escapeHtml(rating)}</span>
      </div>
      <h4 class="td-pop-title">${escapeHtml(d.fullName || 'נהג צי')}</h4>
      <p class="td-pop-sub">${escapeHtml(d.truckType || 'משאית הובלה')}</p>
      <div class="td-pop-grid">
        <div><span>רישוי</span><strong class="td-mono">${escapeHtml(d.truckPlate || '—')}</strong></div>
        <div><span>עיר נוכחית</span><strong>${escapeHtml(getCityName(d.region))}</strong></div>
        <div><span>דגימה אחרונה</span><strong>${escapeHtml(formatLastSeen(d.lastSeenAt || d.updatedAt))}</strong></div>
        <div><span>טלפון</span><strong class="td-mono">${escapeHtml(phone || '—')}</strong></div>
      </div>
      <div class="td-pop-actions">
        <a class="td-btn td-btn-call" href="tel:${escapeHtml(phone.replace(/[^\d+]/g, ''))}">חיוג ישיר 📞</a>
        <a class="td-btn td-btn-wa" href="https://wa.me/${escapeHtml(intl)}?text=${waText}" target="_blank" rel="noopener noreferrer">WhatsApp 💬</a>
      </div>
    </div>`;
};

interface LiveMapProps {
  moves: MoveRequest[];
  onSelectMove: (move: MoveRequest) => void;
  drivers?: FleetDriver[];
}

type SidebarTab = 'moves' | 'drivers';
type MoveFilter = 'all' | 'transit' | 'bidding' | 'completed';

export default function LiveMap({ moves, onSelectMove, drivers = [] }: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileGroupRef = useRef<any>(null);
  const movesGroupRef = useRef<any>(null);
  const driversGroupRef = useRef<any>(null);
  const driverMarkersRef = useRef<Map<string, any>>(new Map());
  const onSelectMoveRef = useRef(onSelectMove);
  onSelectMoveRef.current = onSelectMove;
  const movesRef = useRef(moves);
  movesRef.current = moves;

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [baseLayer, setBaseLayer] = useState<BaseLayerKey>('dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('moves');
  const [moveFilter, setMoveFilter] = useState<MoveFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriverKey, setSelectedDriverKey] = useState<string | null>(null);

  const onlineDrivers: FleetDriver[] = useMemo(() => {
    const active = (drivers || []).filter((d) => d.status === 'active' || !d.status);
    return active.length > 0 ? active : DEMO_FLEET;
  }, [drivers]);
  const usingDemoFleet = onlineDrivers === DEMO_FLEET;

  const term = searchTerm.trim().toLowerCase();

  const filteredMoves = useMemo(
    () =>
      moves.filter((m) => {
        const textMatch =
          !term ||
          m.clientName?.toLowerCase().includes(term) ||
          m.originAddress?.toLowerCase().includes(term) ||
          m.destAddress?.toLowerCase().includes(term) ||
          m.id?.toLowerCase().includes(term);
        if (!textMatch) return false;
        if (moveFilter === 'transit') return m.status === 'approved_for_driver';
        if (moveFilter === 'bidding') return m.status === 'bidding';
        if (moveFilter === 'completed') return m.status === 'completed';
        return true;
      }),
    [moves, term, moveFilter],
  );

  const filteredDrivers = useMemo(
    () =>
      onlineDrivers.filter(
        (d) =>
          !term ||
          d.fullName?.toLowerCase().includes(term) ||
          d.truckPlate?.toLowerCase().includes(term) ||
          d.truckType?.toLowerCase().includes(term) ||
          d.region?.toLowerCase().includes(term),
      ),
    [onlineDrivers, term],
  );

  useEffect(() => {
    loadLeafletCSSAndJS()
      .then(() => setLeafletLoaded(true))
      .catch((err) => {
        console.error('Failed to load map library', err);
        setLoadError(true);
      });
  }, []);

  // Init map once
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || mapRef.current) return;
    const L = window.L;
    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 9,
      zoomControl: false,
      attributionControl: true,
    });
    map.attributionControl.setPrefix(false);
    map.attributionControl.setPosition('bottomleft');

    tileGroupRef.current = L.layerGroup().addTo(map);
    movesGroupRef.current = L.layerGroup().addTo(map);
    driversGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    (window as any).dispatchMapEvent = (moveId: string) => {
      const match = movesRef.current.find((m) => m.id === moveId);
      if (match) onSelectMoveRef.current(match);
    };

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapContainerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      delete (window as any).dispatchMapEvent;
    };
  }, [leafletLoaded]);

  // Base tile layer
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;
    const L = window.L;
    const cfg = BASE_LAYERS[baseLayer];
    const group = tileGroupRef.current;
    group.clearLayers();
    const common = {
      maxZoom: 19,
      maxNativeZoom: cfg.maxNativeZoom,
      attribution: 'Tiles &copy; Esri',
    };
    L.tileLayer(cfg.base, common).addTo(group);
    if (cfg.labels) {
      L.tileLayer(cfg.labels, { ...common, attribution: '', pane: 'overlayPane', zIndex: 250 }).addTo(group);
    }
  }, [leafletLoaded, baseLayer]);

  // Moves: A/B pins, dashed routes, animated trucks
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;
    const L = window.L;
    const group = movesGroupRef.current;
    group.clearLayers();

    const animated: { marker: any; from: [number, number]; to: [number, number]; t: number }[] = [];

    filteredMoves.forEach((move) => {
      const origin = getOffsetCoords(move.id + '_origin', getCityCoords(move.originAddress));
      const dest = getOffsetCoords(move.id + '_dest', getCityCoords(move.destAddress));

      const approvedBid =
        move.driverBids?.find((b) => b.id === move.finalApprovedBidId) || move.driverBids?.find((b) => b.status === 'approved');
      const driverName = approvedBid ? approvedBid.driverName : 'טרם נקבע נהג';
      const bidAmount = approvedBid ? `₪${approvedBid.bidAmount}` : 'ממתין להצעות';

      let routeColor = '#60a5fa';
      let dash: string | null = '6 8';
      let routeClass = '';
      let statusHebrew = 'מכרז פעיל';
      let truckProgress: number | null = null;

      if (move.status === 'completed') {
        routeColor = '#10b981';
        dash = null;
        statusHebrew = 'הושלם בהצלחה 🏁';
      } else if (move.status === 'approved_for_driver') {
        routeColor = '#ff7f00';
        dash = '10 10';
        routeClass = 'td-route-animated';
        statusHebrew = 'משאית בדרך 🚚';
        truckProgress = 0.6;
      } else if (move.status === 'bid_approved') {
        routeColor = '#ff7f00';
        dash = '4 8';
        statusHebrew = 'הצעה אושרה – הכנה להעמסה';
        truckProgress = 0.15;
      }

      const popupContent = `
        <div class="td-pop" dir="rtl">
          <div class="td-pop-head">
            <span class="td-badge-move">הובלה #${escapeHtml(move.id.substring(0, 6))}</span>
            <span class="td-pop-price td-mono">${escapeHtml(bidAmount)}</span>
          </div>
          <h4 class="td-pop-title">${escapeHtml(move.clientName)}</h4>
          <p class="td-pop-sub">מוביל: ${escapeHtml(driverName)}</p>
          <div class="td-pop-route">
            <div><span class="td-pin-a">A</span>${escapeHtml(move.originAddress)}</div>
            <div><span class="td-pin-b">B</span>${escapeHtml(move.destAddress)}</div>
          </div>
          <p class="td-pop-status">${escapeHtml(statusHebrew)}</p>
          <div class="td-pop-actions">
            <button type="button" class="td-btn td-btn-call" onclick="window.dispatchMapEvent('${escapeHtml(move.id)}')">פתח כרטיס הובלה</button>
          </div>
        </div>`;

      // Glow underlay + dashed route
      L.polyline([origin, dest], { color: routeColor, weight: 9, opacity: 0.15, interactive: false }).addTo(group);
      L.polyline([origin, dest], {
        color: routeColor,
        weight: 4,
        opacity: 0.95,
        dashArray: dash,
        className: routeClass,
        lineCap: 'round',
      })
        .bindPopup(popupContent, { className: 'td-popup' })
        .addTo(group);

      L.marker(origin, { icon: pinIcon(L, 'A', '#10b981') }).bindPopup(popupContent, { className: 'td-popup' }).addTo(group);
      L.marker(dest, { icon: pinIcon(L, 'B', '#ff7f00') }).bindPopup(popupContent, { className: 'td-popup' }).addTo(group);

      if (truckProgress !== null) {
        const pos: [number, number] = [
          origin[0] + (dest[0] - origin[0]) * truckProgress,
          origin[1] + (dest[1] - origin[1]) * truckProgress,
        ];
        const truck = L.marker(pos, { icon: truckIcon(L), zIndexOffset: 500 })
          .bindPopup(popupContent, { className: 'td-popup' })
          .addTo(group);
        if (move.status === 'approved_for_driver') animated.push({ marker: truck, from: origin, to: dest, t: truckProgress });
      }
    });

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || animated.length === 0) return;

    const timer = window.setInterval(() => {
      animated.forEach((a) => {
        a.t = a.t >= 0.95 ? 0.05 : a.t + 0.0025;
        a.marker.setLatLng([a.from[0] + (a.to[0] - a.from[0]) * a.t, a.from[1] + (a.to[1] - a.from[1]) * a.t]);
      });
    }, 80);
    return () => window.clearInterval(timer);
  }, [leafletLoaded, filteredMoves]);

  // Drivers layer
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;
    const L = window.L;
    const group = driversGroupRef.current;
    group.clearLayers();
    driverMarkersRef.current.clear();

    filteredDrivers.forEach((d) => {
      const key = getDriverKey(d);
      const marker = L.marker(getDriverCoords(d), { icon: driverIcon(L), zIndexOffset: 800 })
        .bindPopup(buildDriverPopup(d), { className: 'td-popup', minWidth: 240 })
        .on('click', () => setSelectedDriverKey(key))
        .addTo(group);
      driverMarkersRef.current.set(key, marker);
    });
  }, [leafletLoaded, filteredDrivers]);

  // Fit bounds to the active tab's content
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;
    const L = window.L;
    const bounds = L.latLngBounds([]);
    if (sidebarTab === 'moves') {
      filteredMoves.forEach((m) => {
        bounds.extend(getCityCoords(m.originAddress));
        bounds.extend(getCityCoords(m.destAddress));
      });
    } else {
      filteredDrivers.forEach((d) => bounds.extend(getDriverCoords(d)));
    }
    if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
  }, [leafletLoaded, sidebarTab, filteredMoves, filteredDrivers]);

  // Fullscreen: Esc to exit, lock body scroll, resize map after transition
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsFullscreen(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  useEffect(() => {
    const id = window.setTimeout(() => mapRef.current?.invalidateSize({ animate: true }), 320);
    return () => window.clearTimeout(id);
  }, [isFullscreen]);

  const flyToMove = (move: MoveRequest) => {
    if (!mapRef.current) return;
    const origin = getCityCoords(move.originAddress);
    const dest = getCityCoords(move.destAddress);
    mapRef.current.flyToBounds([origin, dest], { padding: [80, 80], maxZoom: 13, duration: 1.4 });
  };

  const flyToDriver = useCallback((d: FleetDriver) => {
    const map = mapRef.current;
    if (!map) return;
    const key = getDriverKey(d);
    setSelectedDriverKey(key);
    const marker = driverMarkersRef.current.get(key);
    map.closePopup();
    map.flyTo(getDriverCoords(d), 14, { duration: 1.4 });
    map.once('moveend', () => marker?.openPopup());
  }, []);

  const moveCounts = {
    all: moves.length,
    transit: moves.filter((m) => m.status === 'approved_for_driver').length,
    bidding: moves.filter((m) => m.status === 'bidding').length,
    completed: moves.filter((m) => m.status === 'completed').length,
  };

  const moveFilterButtons: { key: MoveFilter; label: string }[] = [
    { key: 'all', label: `הכל (${moveCounts.all})` },
    { key: 'transit', label: `בדרך (${moveCounts.transit})` },
    { key: 'bidding', label: `במכרז (${moveCounts.bidding})` },
    { key: 'completed', label: `הושלמו (${moveCounts.completed})` },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 bg-navy-950 p-1 rounded-2xl">
      {/* Sidebar */}
      <aside className="xl:col-span-1 bg-[#0c2445]/40 border border-[#0c2445] rounded-2xl p-4 flex flex-col h-[550px] gap-4" aria-label="רשימת הובלות ונהגים">
        <div role="tablist" aria-label="תצוגת רשימה" className="grid grid-cols-2 gap-1 p-1 bg-navy-950 border border-[#0c2445] rounded-xl">
          <button
            role="tab"
            aria-selected={sidebarTab === 'moves'}
            onClick={() => setSidebarTab('moves')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              sidebarTab === 'moves' ? 'bg-orange-electric text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            הובלות ומכרזים
          </button>
          <button
            role="tab"
            aria-selected={sidebarTab === 'drivers'}
            onClick={() => setSidebarTab('drivers')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              sidebarTab === 'drivers' ? 'bg-emerald-500 text-navy-950 shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {`נהגי צי Online (${onlineDrivers.length})`}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" aria-hidden="true" />
          <label htmlFor="livemap-search" className="sr-only">חיפוש</label>
          <input
            id="livemap-search"
            type="text"
            placeholder={sidebarTab === 'moves' ? 'חפש הובלה, כתובת, לקוח...' : 'חפש נהג, רישוי, עיר...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-navy-950 border border-[#0c2445] rounded-xl text-xs text-white placeholder:text-gray-500 focus:border-orange-electric outline-none transition-colors"
          />
        </div>

        {sidebarTab === 'moves' && (
          <div className="flex flex-wrap gap-1.5">
            {moveFilterButtons.map((b) => (
              <button
                key={b.key}
                onClick={() => setMoveFilter(b.key)}
                aria-pressed={moveFilter === b.key}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer border ${
                  moveFilter === b.key
                    ? 'bg-orange-electric/15 text-orange-electric border-orange-electric/40'
                    : 'bg-navy-950 text-gray-400 border-[#0c2445] hover:text-white'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pl-1 -ml-1">
          {sidebarTab === 'moves' ? (
            filteredMoves.length === 0 ? (
              <p className="text-center py-10 text-gray-500 text-xs">אין הובלות תואמות לסינון</p>
            ) : (
              filteredMoves.map((move) => {
                const approvedBid =
                  move.driverBids?.find((b) => b.id === move.finalApprovedBidId) || move.driverBids?.find((b) => b.status === 'approved');
                const price = approvedBid ? `₪${approvedBid.bidAmount}` : 'ממתין';
                return (
                  <button
                    type="button"
                    key={move.id}
                    onClick={() => flyToMove(move)}
                    className="w-full p-3 bg-navy-950 hover:bg-[#0c2445]/60 border border-[#0c2445] hover:border-orange-electric/40 rounded-xl transition-all cursor-pointer text-right flex flex-col gap-1.5 group"
                  >
                    <span className="flex justify-between items-center gap-2">
                      <span className="font-bold text-white text-xs group-hover:text-orange-electric transition-colors truncate">{move.clientName}</span>
                      <span className="text-[10px] bg-[#0c2445] px-1.5 py-0.5 rounded text-gray-300 font-mono font-bold shrink-0">{price}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-gray-400 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[8px] font-black flex items-center justify-center shrink-0">A</span>
                      <span className="truncate">{move.originAddress.split(',')[0]}</span>
                      <span className="text-gray-600">{'←'}</span>
                      <span className="w-4 h-4 rounded-full bg-orange-electric text-white text-[8px] font-black flex items-center justify-center shrink-0">B</span>
                      <span className="truncate">{move.destAddress.split(',')[0]}</span>
                    </span>
                    <span
                      className={`self-start px-1.5 py-0.5 rounded text-[9px] font-black ${
                        move.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : move.status === 'approved_for_driver'
                            ? 'bg-orange-electric/15 text-orange-electric'
                            : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {move.status === 'completed' ? 'סגור ביעד' : move.status === 'approved_for_driver' ? 'בדרך' : 'מכרז פעיל'}
                    </span>
                  </button>
                );
              })
            )
          ) : filteredDrivers.length === 0 ? (
            <p className="text-center py-10 text-gray-500 text-xs">לא נמצאו נהגים</p>
          ) : (
            filteredDrivers.map((d) => {
              const key = getDriverKey(d);
              const active = selectedDriverKey === key;
              const rating = Number(d.rating || 5);
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => flyToDriver(d)}
                  aria-pressed={active}
                  className={`w-full p-3 bg-navy-950 border rounded-xl transition-all cursor-pointer text-right flex flex-col gap-1.5 ${
                    active ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10' : 'border-[#0c2445] hover:border-emerald-500/40'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="relative flex w-2 h-2 shrink-0">
                        <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                        <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                      </span>
                      <span className="font-bold text-white text-xs truncate">{d.fullName}</span>
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold shrink-0" aria-label={`דירוג ${rating.toFixed(1)}`}>
                      <Star className="w-3 h-3 fill-amber-400" aria-hidden="true" />
                      {rating.toFixed(1)}
                      <span className="sr-only">{renderStars(rating)}</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-gray-400 truncate">
                    <Truck className="w-3 h-3 text-orange-electric shrink-0" aria-hidden="true" />
                    <span className="truncate">{d.truckType}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="font-mono text-gray-200 bg-[#0c2445] px-1.5 py-0.5 rounded tracking-wider">{d.truckPlate || '—'}</span>
                    <span className="flex items-center gap-1 text-gray-400">
                      <MapPin className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                      {getCityName(d.region)}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {formatLastSeen(d.lastSeenAt || d.updatedAt)}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="bg-navy-950/60 border border-[#0c2445] p-2.5 rounded-xl flex items-start gap-2">
          <Info className="w-4 h-4 text-orange-electric shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[10px] text-gray-400 leading-relaxed">
            {sidebarTab === 'drivers' && usingDemoFleet
              ? 'מוצג צי לדוגמה – נהגים רשומים ופעילים יופיעו כאן אוטומטית.'
              : 'לחץ על פריט ברשימה או על סיכה במפה כדי להתמקד ולפתוח את חלונית הפרטים.'}
          </p>
        </div>
      </aside>

      {/* Placeholder keeps grid layout stable while the map is fullscreen */}
      {isFullscreen && <div className="xl:col-span-3 h-[550px] rounded-2xl border border-dashed border-[#0c2445]" aria-hidden="true" />}

      {/* Map */}
      <section
        aria-label="מפה חיה"
        className={`bg-navy-950 border border-[#0c2445] rounded-2xl overflow-hidden ${
          isFullscreen ? 'fixed inset-2 z-50 shadow-2xl shadow-black/60 td-fs-enter' : 'relative xl:col-span-3 h-[550px]'
        }`}
      >
        {!leafletLoaded && (
          <div className="absolute inset-0 bg-navy-950 flex flex-col items-center justify-center text-white z-30 gap-2">
            <RefreshCw className={`w-8 h-8 text-orange-electric ${loadError ? '' : 'animate-spin'}`} aria-hidden="true" />
            <span className="text-xs text-gray-400">{loadError ? 'טעינת המפה נכשלה – רענן את הדף' : 'טוען מפת לוגיסטיקה...'}</span>
          </div>
        )}

        <div ref={mapContainerRef} className="absolute inset-0 z-10" />

        {/* Top controls */}
        <div className="absolute top-3 right-3 left-3 z-20 flex items-start justify-between gap-2 pointer-events-none">
          <div
            role="radiogroup"
            aria-label="שכבת מפה"
            className="pointer-events-auto flex gap-1 p-1 bg-navy-950/90 backdrop-blur-md border border-[#0c2445] rounded-xl shadow-xl"
          >
            {(Object.keys(BASE_LAYERS) as BaseLayerKey[]).map((key) => {
              const Icon = BASE_LAYER_ICONS[key];
              const active = baseLayer === key;
              return (
                <button
                  key={key}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setBaseLayer(key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    active ? 'bg-orange-electric text-white' : 'text-gray-300 hover:text-white hover:bg-[#0c2445]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {BASE_LAYERS[key].label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            aria-label={isFullscreen ? 'יציאה ממסך מלא' : 'הרחבה למסך מלא'}
            title={isFullscreen ? 'יציאה ממסך מלא (Esc)' : 'מסך מלא'}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 bg-navy-950/90 backdrop-blur-md border border-[#0c2445] hover:border-orange-electric/60 text-white rounded-xl shadow-xl transition-all cursor-pointer text-[11px] font-bold"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-orange-electric" /> : <Maximize2 className="w-4 h-4 text-orange-electric" />}
            <span className="hidden sm:inline">{isFullscreen ? 'מזער' : 'מסך מלא'}</span>
          </button>
        </div>

        {/* Zoom + recenter */}
        <div className="absolute bottom-8 left-3 z-20 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="הגדל"
            className="w-9 h-9 bg-navy-950/90 border border-[#0c2445] text-gray-300 hover:text-white rounded-lg shadow-xl transition-all cursor-pointer flex items-center justify-center"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="הקטן"
            className="w-9 h-9 bg-navy-950/90 border border-[#0c2445] text-gray-300 hover:text-white rounded-lg shadow-xl transition-all cursor-pointer flex items-center justify-center"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.flyTo(DEFAULT_CENTER, 9, { duration: 1.2 })}
            aria-label="מרכז מפה"
            className="w-9 h-9 bg-navy-950/90 border border-[#0c2445] text-gray-300 hover:text-white rounded-lg shadow-xl transition-all cursor-pointer flex items-center justify-center"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 right-3 z-20 bg-navy-950/85 backdrop-blur-md px-3 py-2 rounded-lg border border-[#0c2445] text-[10px] text-gray-300 flex flex-wrap items-center gap-x-3 gap-y-1 select-none max-w-[calc(100%-5rem)]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />איסוף A</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-electric" />יעד B</span>
          <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-dashed border-orange-electric" />בדרך</span>
          <span className="flex items-center gap-1">
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </span>
            נהג Online
          </span>
          <span className="hidden md:inline font-mono text-gray-500">TRUK DEALIL LIVE</span>
        </div>
      </section>
    </div>
  );
}
