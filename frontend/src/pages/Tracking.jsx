import React, { useEffect, useRef, useState, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Navigation, MapPin, Truck, Compass, Loader2, RefreshCw,
  Search, ArrowRight, Clock, AlertCircle, PlayCircle, ShieldAlert,
  Sliders, Timer, Users, Package, HelpCircle
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';

// Leaflet Icons Fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom Markers
const originIcon = L.divIcon({
  html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500 shadow-lg"><div class="w-3.5 h-3.5 rounded-full bg-blue-500"></div></div>`,
  className: '', iconSize: [32, 32], iconAnchor: [16, 16]
});

const destIcon = L.divIcon({
  html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 border border-red-500 shadow-lg"><div class="w-3.5 h-3.5 rounded-full bg-red-500"></div></div>`,
  className: '', iconSize: [32, 32], iconAnchor: [16, 16]
});

const truckIcon = L.divIcon({
  html: `<div class="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500 shadow-lg animate-pulse"><div class="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M19 18h2a1 1 0 0 0 1-1v-5.14a1 1 0 0 0-.29-.71l-3.34-3.34a1 1 0 0 0-.71-.29H14"/><circle cx="7.5" cy="18.5" r="2.5"/><circle cx="16.5" cy="18.5" r="2.5"/></svg></div></div>`,
  className: '', iconSize: [36, 36], iconAnchor: [18, 18]
});

const Tracking = () => {
  const { user } = useAuth();
  const [activeTrips, setActiveTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Simulation params
  const [speed, setSpeed] = useState(70);
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState('');
  
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const truckMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const animationFrameRef = useRef(null);
  const routePointsRef = useRef([]);

  // Fetch active trips
  const fetchActiveTrips = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/trips/?status=IN_PROGRESS&page_size=100');
      const results = res.data.results ?? res.data;
      setActiveTrips(results);
      if (results.length > 0 && !selectedTrip) {
        setSelectedTrip(results[0]);
      }
    } catch {
      toast.error('Failed to sync active dispatches.');
    } finally {
      setLoading(false);
    }
  }, [selectedTrip]);

  useEffect(() => {
    fetchActiveTrips();
  }, []);

  // Update map visual path whenever selected trip changes
  useEffect(() => {
    if (!selectedTrip) return;
    let active = true;

    const setupMap = async () => {
      setMapLoading(true);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      try {
        const geocode = async (query) => {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
          const data = await res.json();
          return data && data.length > 0 ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
        };

        const defaultOrigin = [19.076, 72.8775]; // Mumbai
        const defaultDest = [28.7041, 77.1025]; // Delhi

        const origin = await geocode(selectedTrip.route_origin) || defaultOrigin;
        const dest = await geocode(selectedTrip.route_destination) || defaultDest;

        if (!active) return;

        // Fetch routing points
        let routeCoords = [origin, dest];
        try {
          const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson`);
          const routeData = await routeRes.json();
          if (routeData.routes && routeData.routes.length > 0) {
            routeCoords = routeData.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          }
        } catch {
          console.warn("Direct path fallback");
        }

        if (!active) return;
        routePointsRef.current = routeCoords;

        // Leaflet initialize
        if (!mapRef.current) {
          const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false
          }).setView(origin, 6);
          mapRef.current = map;
        } else {
          // Clear previous layers
          mapRef.current.eachLayer(layer => {
            if (layer instanceof L.TileLayer) return;
            mapRef.current.removeLayer(layer);
          });
        }

        const map = mapRef.current;

        // Voyager light mode tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19
        }).addTo(map);

        // Markers
        L.marker(origin, { icon: originIcon }).addTo(map).bindPopup(`<b>Origin:</b> ${selectedTrip.route_origin}`);
        L.marker(dest, { icon: destIcon }).addTo(map).bindPopup(`<b>Destination:</b> ${selectedTrip.route_destination}`);

        // Route Polyline
        const polyline = L.polyline(routeCoords, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.8,
          dashArray: '6, 6'
        }).addTo(map);
        routeLineRef.current = polyline;

        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

        // Moving truck
        const truck = L.marker(origin, { icon: truckIcon }).addTo(map);
        truckMarkerRef.current = truck;

        setMapLoading(false);

        // Loop animation along coordinates
        let idx = 0;
        const ptsLen = routeCoords.length;

        const animateMove = () => {
          if (!active) return;
          idx += 0.06;
          if (idx >= ptsLen - 1) idx = 0;

          const intIdx = Math.floor(idx);
          const nextIdx = Math.min(intIdx + 1, ptsLen - 1);
          const ratio = idx - intIdx;

          const lat1 = routeCoords[intIdx][0];
          const lon1 = routeCoords[intIdx][1];
          const lat2 = routeCoords[nextIdx][0];
          const lon2 = routeCoords[nextIdx][1];

          const curLat = lat1 + (lat2 - lat1) * ratio;
          const curLon = lon1 + (lon2 - lon1) * ratio;

          truck.setLatLng([curLat, curLon]);

          const pct = Math.min(Math.round((idx / (ptsLen - 1)) * 100), 100);
          setProgress(pct);

          const remDist = Math.round(selectedTrip.estimated_distance_km * (1 - pct / 100));
          const hrs = remDist / speed;
          const hrsText = Math.floor(hrs) > 0 ? `${Math.floor(hrs)}h ` : '';
          const minsText = `${Math.round((hrs % 1) * 60)}m`;
          setEta(`${hrsText}${minsText}`);

          animationFrameRef.current = requestAnimationFrame(animateMove);
        };

        animateMove();

      } catch {
        if (active) {
          toast.error("Map path resolution failed.");
          setMapLoading(false);
        }
      }
    };

    setupMap();

    return () => {
      active = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [selectedTrip, speed]);

  const filteredTrips = activeTrips.filter(t => 
    t.trip_number.toLowerCase().includes(search.toLowerCase()) ||
    t.route_origin.toLowerCase().includes(search.toLowerCase()) ||
    t.route_destination.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col lg:flex-row gap-5 relative z-10 page-enter">
      
      {/* ── SIDE LIST PANEL ── */}
      <div className="w-full lg:w-80 flex flex-col gap-4 flex-shrink-0">
        
        {/* Header summary */}
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="h-4.5 w-4.5 text-blue-400" /> Active Tracking
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">{activeTrips.length} dispatches live</p>
          </div>
          <button onClick={() => fetchActiveTrips(true)} disabled={loading}
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-gray-400 hover:text-white transition disabled:opacity-40">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            type="text" placeholder="Search dispatches…" value={search} onChange={e => setSearch(e.target.value)}
            className="block w-full bg-white/[0.03] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-600 focus:border-white/20 outline-none transition"
          />
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'thin' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest animate-pulse">Syncing rosters…</p>
            </div>
          ) : filteredTrips.length > 0 ? (
            filteredTrips.map(trip => {
              const isSelected = selectedTrip?.id === trip.id;
              return (
                <div key={trip.id} onClick={() => setSelectedTrip(trip)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500/30'
                      : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.07]'
                  }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-black text-white">{trip.trip_number}</span>
                    <span className="text-[9px] font-bold text-gray-500 bg-white/[0.03] px-1.5 py-0.5 rounded uppercase">{trip.cargo_type}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                    <span className="truncate max-w-[90px]">{trip.route_origin}</span>
                    <ArrowRight className="h-3 w-3 text-gray-600 flex-shrink-0" />
                    <span className="truncate max-w-[90px]">{trip.route_destination}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-gray-500 mt-2 pt-2 border-t border-white/[0.03]">
                    <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{trip.vehicle_detail?.license_plate}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{trip.driver_detail?.user_name}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-14 border border-dashed border-white/[0.05] rounded-xl text-center p-5">
              <Compass className="h-8 w-8 text-gray-700 mb-2.5 animate-pulse" />
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">No Active Routes</p>
              <p className="text-[10px] text-gray-700 mt-1 max-w-[160px]">Active IN_PROGRESS trips will list here automatically.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── MAP CONTAINER AREA ── */}
      <div className="flex-1 rounded-3xl overflow-hidden border border-white/[0.07] bg-white/[0.01] flex flex-col relative">
        {selectedTrip ? (
          <>
            {/* Map Loading Overlays */}
            {mapLoading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#070b16]/90 backdrop-blur-sm space-y-4">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider animate-pulse">Calculating road routes…</p>
              </div>
            )}

            {/* Map Element */}
            <div ref={mapContainerRef} className="w-full flex-1 z-10" />

            {/* Simulated HUD bar */}
            <div className="h-20 flex items-center justify-between px-6 border-t border-white/[0.06] bg-[#070c1a] relative z-10">
              <div className="grid grid-cols-3 gap-8 flex-1">
                <div>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Estimated Progress</span>
                  <p className="text-xs font-black text-blue-400 mt-0.5">{progress}% Completed</p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Simulated Velocity</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input type="range" min="30" max="120" value={speed} onChange={e => setSpeed(Number(e.target.value))}
                      className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    <span className="text-xs font-bold text-white font-mono">{speed} km/h</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Time to Destination</span>
                  <p className="text-xs font-black text-emerald-400 mt-0.5">{progress === 100 ? 'Arrived' : eta}</p>
                </div>
              </div>
            </div>

            {/* Floating Navigation Card */}
            <div className="absolute top-4 left-4 z-20 w-72 bg-slate-950/85 backdrop-blur-xl border border-white/[0.08] p-4 rounded-2xl space-y-3 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
                <Navigation className="h-4 w-4 text-blue-400" />
                <span className="text-[10px] font-black text-white uppercase tracking-wider">Active Route Tracking</span>
              </div>
              <div className="space-y-3 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-white/[0.06]">
                <div className="relative">
                  <span className="absolute -left-[14.5px] top-1 h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-[9px] text-gray-500 font-bold uppercase">Dispatch Terminal</span>
                  <p className="text-xs text-white font-extrabold truncate">{selectedTrip.route_origin}</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[14.5px] top-1 h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-[9px] text-gray-500 font-bold uppercase">Delivery Terminal</span>
                  <p className="text-xs text-white font-extrabold truncate">{selectedTrip.route_destination}</p>
                </div>
              </div>
              
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(selectedTrip.route_origin)}&destination=${encodeURIComponent(selectedTrip.route_destination)}`}
                target="_blank" rel="noreferrer"
                className="mt-3 flex w-full justify-center items-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-500/20"
              >
                <Navigation className="h-3.5 w-3.5" />
                Navigate (Google Maps)
              </a>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="p-4 rounded-full bg-white/[0.02] border border-white/[0.05]">
              <HelpCircle className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">No Trip Selected</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Select an active trip dispatch from the left panel to display live road maps and navigation vectors.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracking;
