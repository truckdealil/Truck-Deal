import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Truck, RefreshCw, Layers, ZoomIn, ZoomOut, Search, ExternalLink, Info } from 'lucide-react';
import { MoveRequest } from '../types';

// Extend window for Leaflet
declare global {
  interface Window {
    L: any;
  }
}

// Coordinate mapping for major Israeli cities to guarantee fast, bulletproof load
const ISRAEL_CITIES_COORDS: { [key: string]: [number, number] } = {
  'תל אביב': [32.0853, 34.7818],
  'תל-אביב': [32.0853, 34.7818],
  'ירושלים': [31.7683, 35.2137],
  'חיפה': [32.7940, 34.9896],
  'באר שבע': [31.2529, 34.7915],
  'באר-שבע': [31.2529, 34.7915],
  'ראשון לציון': [31.9730, 34.7925],
  'ראשון-לציון': [31.9730, 34.7925],
  'פתח תקווה': [32.0840, 34.8878],
  'פתח-תקווה': [32.0840, 34.8878],
  'אשדוד': [31.8044, 34.6511],
  'נתניה': [32.3215, 34.8532],
  'חולון': [32.0160, 34.7870],
  'בני ברק': [32.0800, 34.8300],
  'בני-ברק': [32.0800, 34.8300],
  'רמת גן': [32.0684, 34.8248],
  'רמת-גן': [32.0684, 34.8248],
  'רחובות': [31.8928, 34.8113],
  'אשקלון': [31.6688, 34.5743],
  'בת ים': [32.0150, 34.7450],
  'בת-ים': [32.0150, 34.7450],
  'הרצליה': [32.1624, 34.8447],
  'כפר סבא': [32.1714, 34.9083],
  'כפר-סבא': [32.1714, 34.9083],
  'חדרה': [32.4340, 34.9197],
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
  'רעננה דרום': [32.1750, 34.8620],
  'נס ציונה': [31.9290, 34.7983],
  'קרית מלאכי': [31.7333, 34.7500],
  'שדרות': [31.5225, 34.5956],
  'נתיבות': [31.4217, 34.5878],
};

const getCityCoords = (address: string): [number, number] => {
  const normalized = address.toLowerCase();
  for (const city of Object.keys(ISRAEL_CITIES_COORDS)) {
    if (normalized.includes(city.toLowerCase())) {
      return ISRAEL_CITIES_COORDS[city];
    }
  }
  // Fallback to center of Israel Gush Dan
  return [32.0853, 34.7818];
};

// Deterministic marker offset to avoid overlap when multiple moves are in the same city
const getOffsetCoords = (id: string, baseCoords: [number, number]): [number, number] => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const offsetLat = ((hash % 100) / 10000) - 0.005; // -0.005 to 0.005
  const offsetLng = (((hash >> 8) % 100) / 10000) - 0.005;
  return [baseCoords[0] + offsetLat, baseCoords[1] + offsetLng];
};

// Helper to load Leaflet resources dynamically from CDN
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

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => reject(new Error('Leaflet load failed'));
    document.body.appendChild(script);
  });
};

interface LiveMapProps {
  moves: MoveRequest[];
  onSelectMove: (move: MoveRequest) => void;
  drivers?: any[];
}

export default function LiveMap({ moves, onSelectMove, drivers = [] }: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const polylinesGroupRef = useRef<any>(null);
  const driversGroupRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<'all' | 'transit' | 'bidding' | 'completed' | 'online_drivers'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtering active moves
  const filteredMoves = moves.filter((m) => {
    // Basic text search
    const textMatch = 
      m.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.originAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.destAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.id && m.id.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!textMatch) return false;

    // Filter by live tracking status on map
    if (selectedRouteFilter === 'all') return true;
    if (selectedRouteFilter === 'transit') return m.status === 'approved_for_driver';
    if (selectedRouteFilter === 'bidding') return m.status === 'bidding';
    if (selectedRouteFilter === 'completed') return m.status === 'completed';
    return true;
  });

  // Load Leaflet
  useEffect(() => {
    loadLeafletCSSAndJS()
      .then(() => {
        setLeafletLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to load map library', err);
      });
  }, []);

  // Initialize and update the map tiles and layers
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    const L = window.L;

    if (!mapRef.current) {
      // Map center initialized to Tel Aviv, Gush Dan Israel
      mapRef.current = L.map(mapContainerRef.current, {
        center: [32.0853, 34.7818],
        zoom: 9,
        zoomControl: false, // Customized buttons
        attributionControl: false
      });

      // Layer groups for clean additions and removals
      markersGroupRef.current = L.layerGroup().addTo(mapRef.current);
      polylinesGroupRef.current = L.layerGroup().addTo(mapRef.current);
      driversGroupRef.current = L.layerGroup().addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Remove existing tile layers to reload theme
    map.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    // Dark vs Light Theme setup
    const tileUrl = mapTheme === 'dark' 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
    }).addTo(map);

    // Initial resize to fit within the viewport
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      // Keep map alive unless unmounted
    };
  }, [leafletLoaded, mapTheme]);

  // Redraw markers and routes when moves or drivers change
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;

    const L = window.L;
    const map = mapRef.current;

    // Clear old markers, paths, and drivers
    if (markersGroupRef.current) markersGroupRef.current.clearLayers();
    if (polylinesGroupRef.current) polylinesGroupRef.current.clearLayers();
    if (driversGroupRef.current) driversGroupRef.current.clearLayers();

    const bounds = L.latLngBounds();

    filteredMoves.forEach((move) => {
      const originBase = getCityCoords(move.originAddress);
      const destBase = getCityCoords(move.destAddress);

      // Introduce dynamic offset so same-city routes don't completely overlap
      const originCoords = getOffsetCoords(move.id + '_origin', originBase);
      const destCoords = getOffsetCoords(move.id + '_dest', destBase);

      bounds.extend(originCoords);
      bounds.extend(destCoords);

      // 1. Draw Origin Marker (A)
      const originColor = '#f97316'; // orange-electric
      const originHtml = `<div class="w-7 h-7 rounded-full bg-orange-electric text-white border-2 border-white flex items-center justify-center font-bold shadow-lg shadow-orange-500/20 text-xs">A</div>`;
      const originIcon = L.divIcon({
        html: originHtml,
        className: 'custom-map-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const originMarker = L.marker(originCoords, { icon: originIcon })
        .addTo(markersGroupRef.current);

      // 2. Draw Destination Marker (B)
      const destColor = '#10b981'; // emerald-500
      const destHtml = `<div class="w-7 h-7 rounded-full bg-emerald-500 text-white border-2 border-white flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20 text-xs font-sans">B</div>`;
      const destIcon = L.divIcon({
        html: destHtml,
        className: 'custom-map-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const destMarker = L.marker(destCoords, { icon: destIcon })
        .addTo(markersGroupRef.current);

      // 3. Draw Route Polyline
      // Color depends on move status
      let routeColor = '#3b82f6'; // default blue
      let dashArrayStr = '5, 5';
      if (move.status === 'completed') {
        routeColor = '#10b981'; // green
        dashArrayStr = '';
      } else if (move.status === 'approved_for_driver') {
        routeColor = '#f97316'; // orange
        dashArrayStr = '10, 5';
      }

      const polyline = L.polyline([originCoords, destCoords], {
        color: routeColor,
        weight: 4,
        dashArray: dashArrayStr,
        opacity: 0.85
      }).addTo(polylinesGroupRef.current);

      // 4. Draw Animated Truck Position (Calculated on state)
      let truckCoords: [number, number] = originCoords;
      let progressPct = 'מוצא';
      let statusHebrew = 'ממתין להתחלה';

      if (move.status === 'completed') {
        truckCoords = destCoords;
        progressPct = 'הגיע ליעד';
        statusHebrew = 'הושלם בהצלחה 🏁';
      } else if (move.status === 'approved_for_driver') {
        // Truck is in transit, place it at 60% of route
        truckCoords = [
          originCoords[0] + (destCoords[0] - originCoords[0]) * 0.6,
          originCoords[1] + (destCoords[1] - originCoords[1]) * 0.6
        ];
        progressPct = 'בדרך (60%)';
        statusHebrew = 'משאית פעילה בדרך 🚚';
      } else if (move.status === 'bid_approved') {
        truckCoords = [
          originCoords[0] + (destCoords[0] - originCoords[0]) * 0.25,
          originCoords[1] + (destCoords[1] - originCoords[1]) * 0.25
        ];
        progressPct = 'הכנה להעמסה (25%)';
        statusHebrew = 'הצעה אושרה, בתהליך';
      }

      const truckHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-10 h-10 bg-orange-electric/30 border border-orange-electric rounded-full animate-ping"></div>
          <div class="w-8 h-8 rounded-full bg-orange-electric border-2 border-white shadow-xl flex items-center justify-center z-10">
            <svg class="w-4 h-4 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16V10a2 2 0 00-2-2h-3V6" />
            </svg>
          </div>
        </div>
      `;
      const truckIcon = L.divIcon({
        html: truckHtml,
        className: 'custom-truck-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const truckMarker = L.marker(truckCoords, { icon: truckIcon })
        .addTo(markersGroupRef.current);

      // 5. Add Gorgeous Popup to all elements of this route
      const approvedBid = move.driverBids.find(b => b.id === move.finalApprovedBidId) || move.driverBids.find(b => b.status === 'approved');
      const driverName = approvedBid ? approvedBid.driverName : 'טרם נקבע נהג';
      const bidAmount = approvedBid ? `₪${approvedBid.bidAmount}` : 'ממתין להצעות';

      // Personalized WhatsApp dispatch message (Section 3ג)
      const targetDriverName = driverName !== 'טרם נקבע נהג' ? driverName : 'מוביל יקר';
      const truckTypeStr = move.assignedTruckModel || (move.craneNeeded === 'yes' ? 'מנוף סולם / משאית מנוף' : 'משאית סגורה 7.5–12 טון עם רמפה');
      const netDriverPay = approvedBid ? approvedBid.bidAmount : 1850;
      const cargoSummary = move.items && move.items.length > 0 ? move.items.map(i => `${i.name} (${i.quantity})`).join(', ') : 'תכולת הובלה מלאה';
      const waMessage = `שלום ${targetDriverName}, נכנסה הרגע הובלה מותאמת בול לרכב ${truckTypeStr} ולציר הנסיעה שלך:
📍 מסלול: ${move.originAddress} ➔ ${move.destAddress}
📦 תכולה: ${cargoSummary}, קומה ${move.floor}
💵 שכר נטו למוביל: ₪${netDriverPay}
🔗 לצפייה והגשת הצעה ישירה: https://truck-deal.vercel.app/?view=driver&moveId=${move.id}`;
      const encodedWaUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waMessage)}`;

      const popupContent = `
        <div class="p-3 bg-navy-950 text-white rounded-lg text-right font-sans min-w-[250px]" dir="rtl">
          <div class="flex justify-between items-center pb-2 border-b border-navy-800 mb-2">
            <span class="text-[10px] bg-orange-electric/20 text-orange-electric font-black px-1.5 py-0.5 rounded">הובלה #${move.id.substring(0,6)}</span>
            <span class="text-xs font-bold text-gray-300 font-mono">${bidAmount}</span>
          </div>
          
          <h4 class="font-bold text-sm text-white mb-1">לקוח: ${move.clientName}</h4>
          <p class="text-[10px] text-gray-400 mb-1">📞 טלפון: ${move.clientPhone}</p>
          <p class="text-[10px] text-orange-electric mb-2 font-bold">🚚 מוביל: ${driverName}</p>
          
          <div class="space-y-1 mb-2.5 text-[10px] bg-navy-900/60 p-2 rounded border border-navy-800/80">
            <div class="flex gap-1 items-start">
              <span class="text-gray-500 shrink-0">מוצא:</span>
              <span class="text-white">${move.originAddress}</span>
            </div>
            <div class="flex gap-1 items-start">
              <span class="text-gray-500 shrink-0">יעד:</span>
              <span class="text-white">${move.destAddress}</span>
            </div>
          </div>

          <div class="text-[10px] text-emerald-400 font-bold mb-3">
            📍 סטטוס: ${statusHebrew} (${progressPct})
          </div>

          <div class="space-y-1.5">
            <button 
              onclick="window.dispatchMapEvent('${move.id}')"
              class="w-full text-center py-1.5 bg-orange-electric hover:bg-orange-600 text-white font-bold rounded text-[10px] cursor-pointer transition-all flex items-center justify-center gap-1"
            >
              📊 פתח כרטיס הובלה ניהולי
            </button>
            <a 
              href="${encodedWaUrl}" 
              target="_blank" 
              class="w-full text-center py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] cursor-pointer transition-all flex items-center justify-center gap-1 text-decoration-none block"
            >
              📲 שיגור אישי ישיר ב-WhatsApp
            </a>
          </div>
        </div>
      `;

      // Bind popups
      originMarker.bindPopup(popupContent);
      destMarker.bindPopup(popupContent);
      truckMarker.bindPopup(popupContent);
      polyline.bindPopup(popupContent);
    });

    // 6. Draw Online Drivers (Priority radius 25 km & Backhauls)
    if (selectedRouteFilter === 'all' || selectedRouteFilter === 'online_drivers') {
      const onlineDrivers = (drivers || []).filter((d: any) => d.status === 'active' || !d.status);
      onlineDrivers.forEach((driver: any) => {
        const baseCity = driver.region || 'תל אביב';
        const baseCoords = getCityCoords(baseCity);
        const driverCoords = getOffsetCoords('drv_' + (driver.id || driver.phone), baseCoords);
        bounds.extend(driverCoords);

        const driverHtml = `
          <div class="relative flex items-center justify-center cursor-pointer">
            <div class="absolute w-8 h-8 bg-emerald-400/30 border border-emerald-400 rounded-full animate-ping"></div>
            <div class="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs z-10 font-bold">
              🚚
            </div>
          </div>
        `;
        const driverIcon = L.divIcon({
          html: driverHtml,
          className: 'custom-driver-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        // Generate personalized direct WhatsApp dispatch for this specific driver
        const targetMove = moves.find(m => m.status === 'bidding') || moves[0];
        let directDispatchBtn = '';
        if (targetMove) {
          const directMsg = `שלום ${driver.fullName || 'מוביל'}, נכנסה הרגע הובלה מותאמת בול לרכב ${driver.truckType || 'משאית הובלות'} ולציר הנסיעה שלך:
📍 מסלול: ${targetMove.originAddress} ➔ ${targetMove.destAddress}
📦 תכולה: ${targetMove.items && targetMove.items.length > 0 ? targetMove.items.map(i => `${i.name} (${i.quantity})`).join(', ') : 'תכולת דירה מלאה'}, קומה ${targetMove.floor}
💵 שכר נטו למוביל: ₪1,850
🔗 לצפייה והגשת הצעה ישירה: https://truck-deal.vercel.app/?view=driver&moveId=${targetMove.id}`;
          const directWaUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(directMsg)}`;
          directDispatchBtn = `
            <a 
              href="${directWaUrl}" 
              target="_blank" 
              class="w-full text-center py-1.5 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] cursor-pointer transition-all flex items-center justify-center gap-1 block"
              style="text-decoration: none;"
            >
              📲 שיגור הובלה מותאמת ב-WhatsApp
            </a>
          `;
        }

        const driverPopup = `
          <div class="p-3 bg-navy-950 text-white rounded-lg text-right font-sans min-w-[240px]" dir="rtl">
            <div class="flex justify-between items-center pb-1.5 border-b border-navy-800 mb-2">
              <span class="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                נהג Online 🟢
              </span>
              <span class="text-xs font-bold text-amber-400">★ ${driver.rating || '5.0'}</span>
            </div>
            <h4 class="font-bold text-sm text-white mb-0.5">${driver.fullName || 'נהג מורשה'}</h4>
            <p class="text-[10px] text-gray-400 mb-1">📞 טלפון: ${driver.phone || 'ממתין לעדכון'}</p>
            <div class="p-2 bg-navy-900 rounded border border-navy-800 text-[10px] space-y-1 mb-2">
              <p class="text-orange-electric font-semibold">🚛 כלי רכב: ${driver.truckType || 'משאית הובלות'}</p>
              <p class="text-gray-300">📍 אזור פעילות: ${driver.region || 'מרכז והשרון'}</p>
              <p class="text-emerald-400 font-bold">🎯 קדימות ברדיוס 25 ק"מ ממיקום GPS</p>
            </div>
            ${directDispatchBtn}
          </div>
        `;

        L.marker(driverCoords, { icon: driverIcon })
          .bindPopup(driverPopup)
          .addTo(driversGroupRef.current);
      });
    }

    // Expose click routing callback safely to HTML popup
    (window as any).dispatchMapEvent = (moveId: string) => {
      const match = moves.find(m => m.id === moveId);
      if (match) {
        onSelectMove(match);
      }
    };

    // Auto fit map boundary viewport to include all coordinates with clean padding
    try {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    } catch (e) {
      // Swallowed in case bounds are empty
    }
  }, [filteredMoves, leafletLoaded, moves, drivers, onSelectMove, selectedRouteFilter]);

  // Center map on a specific move clicked from the sidebar
  const flyToMove = (move: MoveRequest) => {
    if (!leafletLoaded || !mapRef.current) return;
    const originCoords = getCityCoords(move.originAddress);
    mapRef.current.flyTo(originCoords, 12, {
      animate: true,
      duration: 1.5
    });
  };

  const zoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const zoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 bg-navy-950 p-1 rounded-2xl">
      
      {/* Right Sidebar - Active routes list on Map */}
      <div className="xl:col-span-1 bg-navy-900 border border-navy-800 rounded-2xl p-4 flex flex-col h-[550px] space-y-4">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="חפש הובלה, כתובת, מוביל..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-navy-950 border border-navy-700 rounded-xl text-xs text-white focus:border-orange-electric outline-none"
          />
        </div>

        {/* Legend buttons filter */}
        <div className="flex flex-wrap gap-1.5 border-b border-navy-800 pb-3">
          <button
            onClick={() => setSelectedRouteFilter('all')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${selectedRouteFilter === 'all' ? 'bg-orange-electric text-white' : 'bg-navy-950 text-gray-400 border border-navy-850'}`}
          >
            הכל ({moves.length})
          </button>
          <button
            onClick={() => setSelectedRouteFilter('transit')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${selectedRouteFilter === 'transit' ? 'bg-orange-electric/25 text-orange-electric border border-orange-electric/30' : 'bg-navy-950 text-gray-400 border border-navy-850'}`}
          >
            🚚 בדרך ({moves.filter(m => m.status === 'approved_for_driver').length})
          </button>
          <button
            onClick={() => setSelectedRouteFilter('bidding')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${selectedRouteFilter === 'bidding' ? 'bg-blue-500/25 text-blue-400 border border-blue-500/30' : 'bg-navy-950 text-gray-400 border border-navy-850'}`}
          >
            ⏳ במכרז ({moves.filter(m => m.status === 'bidding').length})
          </button>
          <button
            onClick={() => setSelectedRouteFilter('completed')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${selectedRouteFilter === 'completed' ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/30' : 'bg-navy-950 text-gray-400 border border-navy-850'}`}
          >
            🏁 הושלמו ({moves.filter(m => m.status === 'completed').length})
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-navy-800">
          {filteredMoves.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-xs">
              אין הובלות תואמות לסינון במפה
            </div>
          ) : (
            filteredMoves.map((move) => {
              const approvedBid = move.driverBids.find(b => b.id === move.finalApprovedBidId) || move.driverBids.find(b => b.status === 'approved');
              const driverName = approvedBid ? approvedBid.driverName : 'טרם נקבע';
              const price = approvedBid ? `₪${approvedBid.bidAmount}` : 'ממתין';

              return (
                <div
                  key={move.id}
                  onClick={() => flyToMove(move)}
                  className="p-3 bg-navy-950 hover:bg-navy-850 border border-navy-850 hover:border-navy-700 rounded-xl transition-all cursor-pointer text-right space-y-1 group"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs group-hover:text-orange-electric transition-colors">{move.clientName}</span>
                    <span className="text-[10px] bg-navy-900 border border-navy-800 px-1.5 py-0.5 rounded text-gray-400 font-mono font-bold">{price}</span>
                  </div>

                  <p className="text-[10px] text-gray-400 truncate">מוצא: {move.originAddress.split(',')[0]} ➔ יעד: {move.destAddress.split(',')[0]}</p>

                  <div className="flex items-center justify-between text-[9px] pt-1 border-t border-navy-900/60">
                    <span className="text-gray-500">נהג: <strong className="text-gray-300">{driverName}</strong></span>
                    <span className={`px-1.5 py-0.2 rounded font-black ${
                      move.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                      move.status === 'approved_for_driver' ? 'bg-orange-electric/15 text-orange-electric' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>
                      {move.status === 'completed' ? 'סגור ביעד' :
                       move.status === 'approved_for_driver' ? 'בדרך' :
                       'מכרז פעיל'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Legend Guide Info Card */}
        <div className="bg-navy-950/60 border border-navy-850 p-2.5 rounded-xl flex items-start gap-2">
          <Info className="w-4 h-4 text-orange-electric shrink-0 mt-0.5" />
          <p className="text-[9px] text-gray-400 leading-normal">
            לחץ על סמן במפה או על הובלה ברשימה כדי להתמקד (Fly-To) ולצפות בחלונית המעקב עם פרטי הלקוח וקישורי הניהול המהירים.
          </p>
        </div>
      </div>

      {/* Left Map Display Container */}
      <div className="xl:col-span-3 bg-navy-900 border border-navy-800 rounded-2xl relative overflow-hidden h-[550px]">
        
        {/* Loading overlay if leaflet is not ready */}
        {!leafletLoaded && (
          <div className="absolute inset-0 bg-navy-950 flex flex-col items-center justify-center text-white z-50">
            <RefreshCw className="w-8 h-8 text-orange-electric animate-spin mb-2" />
            <span className="text-xs text-gray-400">טוען מפת לוגיסטיקה דינמית...</span>
          </div>
        )}

        {/* Map Container Leaflet mounts here */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Top Control Bar floating inside Map overlay */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          
          {/* Theme switcher */}
          <button
            onClick={() => setMapTheme(mapTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 bg-navy-950 border border-navy-850 text-gray-300 hover:text-white rounded-xl shadow-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <Layers className="w-3.5 h-3.5 text-orange-electric" />
            <span>תצוגת {mapTheme === 'dark' ? 'לווין יום' : 'וקטור לילה'}</span>
          </button>
        </div>

        {/* Left Control Bar Zoom Buttons */}
        <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1">
          <button
            onClick={zoomIn}
            className="w-8 h-8 bg-navy-950 border border-navy-850 text-gray-300 hover:text-white rounded-lg shadow-xl transition-all cursor-pointer flex items-center justify-center"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={zoomOut}
            className="w-8 h-8 bg-navy-950 border border-navy-850 text-gray-300 hover:text-white rounded-lg shadow-xl transition-all cursor-pointer flex items-center justify-center"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {/* Map Watermark branding overlay */}
        <div className="absolute bottom-4 right-4 z-20 bg-navy-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-navy-850 text-[9px] text-gray-400 font-mono flex items-center gap-1 select-none">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
          <span>TRUK DEALIL LIVE TRACKING ENGINE • ISRAEL LAYER</span>
        </div>

      </div>

    </div>
  );
}
