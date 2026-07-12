import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Square, Loader2, Navigation, Compass, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons issue in React builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Create custom icons for cargo and vehicles
const originIcon = L.divIcon({
  html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500 shadow-lg shadow-blue-500/50"><div class="w-3.5 h-3.5 rounded-full bg-blue-500"></div></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const destIcon = L.divIcon({
  html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 border border-red-500 shadow-lg shadow-red-500/50"><div class="w-3.5 h-3.5 rounded-full bg-red-500"></div></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const truckIcon = L.divIcon({
  html: `<div class="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse"><div class="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M19 18h2a1 1 0 0 0 1-1v-5.14a1 1 0 0 0-.29-.71l-3.34-3.34a1 1 0 0 0-.71-.29H14"/><circle cx="7.5" cy="18.5" r="2.5"/><circle cx="16.5" cy="18.5" r="2.5"/></svg></div></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

const LiveTrackerModal = ({ trip, onClose }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const truckMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [speed, setSpeed] = useState(60); // km/h simulation
  const [progress, setProgress] = useState(0); // 0 to 100%
  const [eta, setEta] = useState('');
  const [currentCity, setCurrentCity] = useState('');

  // Setup simulated route coordinate lists
  useEffect(() => {
    let active = true;

    const initMap = async () => {
      setLoading(true);
      setError(null);

      try {
        // Step 1: Geocode Origin and Destination using free OpenStreetMap Nominatim API
        const geocode = async (query) => {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
          const data = await res.json();
          if (data && data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
          }
          return null;
        };

        // Standard Indian defaults if geocoding fails
        const defaultOrigin = [19.076, 72.8775]; // Mumbai
        const defaultDest = [28.7041, 77.1025]; // Delhi

        const originCoords = await geocode(trip.route_origin) || defaultOrigin;
        const destCoords = await geocode(trip.route_destination) || defaultDest;

        if (!active) return;

        // Step 2: Fetch actual road path from OSRM Routing Machine (Free open source)
        let routeCoords = [originCoords, destCoords]; // Fallback to straight line
        try {
          const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${originCoords[1]},${originCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`);
          const routeData = await routeRes.json();
          if (routeData.routes && routeData.routes.length > 0) {
            // Convert coordinates from [lon, lat] to [lat, lon]
            routeCoords = routeData.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
          }
        } catch (e) {
          console.warn("OSRM routing failed, using direct line:", e);
        }

        if (!active) return;

        // Step 3: Initialize Leaflet map
        if (mapRef.current) {
          mapRef.current.remove();
        }

        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false
        }).setView(originCoords, 6);

        mapRef.current = map;

        // Dark matter tiles styling (CartoDB)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19
        }).addTo(map);

        // Add custom markers
        L.marker(originCoords, { icon: originIcon }).addTo(map).bindPopup(`<b>Origin</b><br>${trip.route_origin}`);
        L.marker(destCoords, { icon: destIcon }).addTo(map).bindPopup(`<b>Destination</b><br>${trip.route_destination}`);

        // Draw Route Line
        const polyline = L.polyline(routeCoords, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.8,
          dashArray: '8, 8'
        }).addTo(map);

        routeLineRef.current = polyline;

        // Zoom map to fit both markers
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

        // Add Moving Truck Marker
        const truck = L.marker(originCoords, { icon: truckIcon }).addTo(map);
        truckMarkerRef.current = truck;

        setLoading(false);

        // Step 4: Simulate Live Movement
        let currentIndex = 0;
        const totalPoints = routeCoords.length;

        const animate = () => {
          if (!active) return;

          // Increment along the points list
          currentIndex += 0.05; // speed step
          if (currentIndex >= totalPoints - 1) {
            currentIndex = 0; // loop simulation
          }

          const indexInteger = Math.floor(currentIndex);
          const nextIndex = Math.min(indexInteger + 1, totalPoints - 1);
          const ratio = currentIndex - indexInteger;

          // Linear interpolation between points
          const lat1 = routeCoords[indexInteger][0];
          const lon1 = routeCoords[indexInteger][1];
          const lat2 = routeCoords[nextIndex][0];
          const lon2 = routeCoords[nextIndex][1];

          const currentLat = lat1 + (lat2 - lat1) * ratio;
          const currentLon = lon1 + (lon2 - lon1) * ratio;
          const currentPoint = [currentLat, currentLon];

          // Update marker position
          if (truck.setLatLng) {
            truck.setLatLng(currentPoint);
          }

          // Dynamic Progress calculation
          const pct = Math.min(Math.round((currentIndex / (totalPoints - 1)) * 100), 100);
          setProgress(pct);

          // Calculate Simulated ETA
          const remainingDistance = Math.round(trip.estimated_distance_km * (1 - pct / 100));
          const hours = remainingDistance / speed;
          const hrsText = Math.floor(hours) > 0 ? `${Math.floor(hours)}h ` : '';
          const minsText = `${Math.round((hours % 1) * 60)}m`;
          setEta(`${hrsText}${minsText}`);

          animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

      } catch (err) {
        if (active) {
          setError("Failed to resolve route. Please try again.");
          setLoading(false);
        }
      }
    };

    initMap();

    return () => {
      active = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (mapRef.current) mapRef.current.remove();
    };
  }, [trip]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden flex flex-col border border-white/[0.08] shadow-2xl relative"
        style={{ background: '#070b16' }}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06] bg-gradient-to-r from-blue-950/20 to-cyan-950/10 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <h3 className="text-sm font-black text-white tracking-tight">Live Fleet Tracker</h3>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Trip <span className="font-mono text-white">{trip.trip_number}</span> · {trip.vehicle_detail?.license_plate} ({trip.driver_detail?.user_name})
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-white/[0.05] bg-white/[0.01]">
          <div className="p-4 border-r border-white/[0.05] text-center">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Cargo Type</span>
            <p className="text-xs font-black text-white mt-1 capitalize">{trip.cargo_type}</p>
          </div>
          <div className="p-4 border-r border-white/[0.05] text-center">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Route Progress</span>
            <p className="text-xs font-black text-blue-400 mt-1">{progress}% Completed</p>
          </div>
          <div className="p-4 border-r border-white/[0.05] text-center">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Simulated Speed</span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <input type="range" min="30" max="120" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              <span className="text-xs font-black text-white font-mono">{speed} km/h</span>
            </div>
          </div>
          <div className="p-4 text-center">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Est. Time of Arrival</span>
            <p className="text-xs font-black text-emerald-400 mt-1">{progress === 100 ? 'Arrived' : eta}</p>
          </div>
        </div>

        {/* Map Body */}
        <div className="flex-1 relative min-h-0 bg-[#080d1a]">
          {loading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#070b16]/90 backdrop-blur-sm space-y-4">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-xs text-gray-400 font-bold tracking-wider uppercase animate-pulse">Calculating road network routes…</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#070b16]/95 p-6 text-center space-y-3">
              <Compass className="h-10 w-10 text-red-500/40 animate-pulse" />
              <p className="text-xs text-red-400 font-bold uppercase tracking-wider">{error}</p>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 rounded-xl text-white text-xs font-bold shadow-lg">Retry Connection</button>
            </div>
          )}

          {/* Actual Leaflet Map element */}
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Floating Route Cards */}
          <div className="absolute top-4 left-4 z-20 w-72 bg-slate-950/80 backdrop-blur-xl border border-white/[0.08] p-4 rounded-2xl space-y-3 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
              <Navigation className="h-4 w-4 text-blue-400" />
              <span className="text-[10px] font-black text-white uppercase tracking-wider">Active Route Log</span>
            </div>
            
            <div className="space-y-3 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-white/[0.06]">
              <div className="relative">
                <span className="absolute -left-[14.5px] top-1 h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-[9px] text-gray-500 font-bold uppercase">Origin Dispatch</span>
                <p className="text-xs text-white font-extrabold truncate">{trip.route_origin}</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[14.5px] top-1 h-2 w-2 rounded-full bg-red-500" />
                <span className="text-[9px] text-gray-500 font-bold uppercase">Destination Terminal</span>
                <p className="text-xs text-white font-extrabold truncate">{trip.route_destination}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LiveTrackerModal;
