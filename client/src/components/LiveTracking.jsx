import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.DEV ? `http://${window.location.hostname}:5000` : undefined);

// Fix Leaflet's default icon path issues
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom pulse icon for the live user marker
const UserLiveIcon = L.divIcon({
  className: 'custom-live-marker',
  html: `<div style="width: 20px; height: 20px; background-color: #7c5cff; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(124,92,255,0.8); position: relative;">
           <div style="position: absolute; top: -5px; left: -5px; right: -5px; bottom: -5px; border-radius: 50%; border: 2px solid #7c5cff; animation: pulse 1.5s infinite;"></div>
         </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Component to recenter map and inject CSS
const MapSetup = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 14);
    }
    
    // Inject pulse animation CSS if not exists
    if (!document.getElementById('pulse-anim')) {
      const style = document.createElement('style');
      style.id = 'pulse-anim';
      style.innerHTML = `
        @keyframes pulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }, [center, map]);
  return null;
};

function LiveTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [route, setRoute] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Join the tracking session
    socket.emit('join_tracking', id);

    // Listen for the initial route data payload
    socket.on('route_data', (routePayload) => {
      if (routePayload && routePayload.geometry && routePayload.geometry.coordinates) {
        // Convert [lng, lat] from OSRM to [lat, lng] for Leaflet
        const latLngCoords = routePayload.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRoute(latLngCoords);
      } else {
        setError('Invalid route data received from server.');
      }
    });

    // Listen for tracking errors (e.g. invalid session)
    socket.on('tracking_error', (errMsg) => {
      setError(errMsg);
    });

    // Listen for real-time location updates
    socket.on('location_update', (data) => {
      if (data && data.position) {
        setCurrentPosition(data.position); // [lat, lng]
      }
    });

    return () => {
      socket.off('route_data');
      socket.off('location_update');
      socket.off('tracking_error');
    };
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1424] text-white flex flex-col items-center justify-center p-4">
        <div className="bg-red-900/30 border border-red-500 p-6 rounded-lg text-center max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">Tracking Error</h2>
          <p className="text-red-200 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-accentPurple hover:bg-purple-600 px-6 py-2 rounded text-white font-bold transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-[#0f1424] text-white flex items-center justify-center">
        <div className="animate-pulse text-accentPurple font-bold">Connecting to live feed...</div>
      </div>
    );
  }

  const origin = route[0];
  const destination = route[route.length - 1];
  
  // Use the real-time position if available, otherwise default to origin
  const activePos = currentPosition || origin;
  
  // Basic distance check to see if arrived (within 50 meters of destination)
  // Distance function in meters
  const getDistance = (pos1, pos2) => {
    if (!pos1 || !pos2) return Infinity;
    return L.latLng(pos1[0], pos1[1]).distanceTo(L.latLng(pos2[0], pos2[1]));
  };
  const isArrived = getDistance(activePos, destination) < 50;

  const totalDist = getDistance(origin, destination);
  const currentDist = getDistance(origin, activePos);
  
  let progressPct = 5;
  if (isArrived) {
    progressPct = 100;
  } else if (totalDist > 0 && currentPosition) {
    // Cap at 95% until actually arrived
    progressPct = Math.min(95, Math.max(5, (currentDist / totalDist) * 100));
  }

  return (
    <div className="min-h-screen flex flex-col h-screen bg-[#0f1424] text-white">
      <header className="bg-[#1a1f35] border-b border-gray-800 p-4 shadow-md z-10 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex items-center justify-center text-accentPurple drop-shadow-[0_0_8px_rgba(124,92,255,0.8)]">
              <svg viewBox="0 0 100 100" fill="currentColor" className="w-8 h-8">
                <defs>
                  <mask id="map-cutout-live">
                    <rect x="0" y="0" width="100" height="100" fill="white" />
                    <path d="M10 70 Q 30 75 50 65 T 90 60" fill="none" stroke="black" strokeWidth="4" />
                    <path d="M50 15 C38.95 15 30 23.95 30 35 C30 50 46.5 68 48.5 70.3 C49.3 71.2 50.7 71.2 51.5 70.3 C53.5 68 70 50 70 35 C70 23.95 61.05 15 50 15 Z" fill="black" stroke="black" strokeWidth="3" strokeLinejoin="round" />
                  </mask>
                </defs>
                <polygon points="26,55 48,55 48,85 15,85" mask="url(#map-cutout-live)" />
                <polygon points="52,55 74,55 85,85 52,85" mask="url(#map-cutout-live)" />
                <path d="M50 15 C38.95 15 30 23.95 30 35 C30 50 46.5 68 48.5 70.3 C49.3 71.2 50.7 71.2 51.5 70.3 C53.5 68 70 50 70 35 C70 23.95 61.05 15 50 15 Z M50 45 C44.48 45 40 40.52 40 35 C40 29.48 44.48 25 50 25 C55.52 25 60 29.48 60 35 C60 40.52 55.52 45 50 45 Z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">Trusted Contact Live Tracking</h1>
          </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isArrived ? 'bg-green-400' : 'bg-red-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isArrived ? 'bg-green-500' : 'bg-red-500'}`}></span>
          </span>
          <span className="text-sm font-medium text-gray-300">
            {isArrived ? 'Arrived safely' : 'Live updates active'}
          </span>
        </div>
      </header>

      <main className="flex-grow relative">
        <MapContainer 
          center={origin} 
          zoom={14} 
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <MapSetup center={currentPosition} />

          <Polyline positions={route} color="#7c5cff" weight={5} opacity={0.5} dashArray="10, 10" />

          {/* Destination Marker */}
          <Marker position={destination}>
            <Popup>Destination</Popup>
          </Marker>
          {/* Real-time moving user marker */}
          {activePos && (
            <Marker position={activePos} icon={UserLiveIcon} zIndexOffset={1000}>
              <Popup className="custom-popup">
                <div className="font-bold text-accentPurple">Trusted Contact</div>
                <div className="text-sm">Live Location</div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
        
        {/* Overlay HUD */}
        <div className="absolute bottom-6 left-6 z-[1000] bg-[#1a1f35]/90 backdrop-blur border border-gray-700 p-4 rounded-lg shadow-xl w-64 pointer-events-none">
          <h3 className="font-bold mb-2">Trip Status</h3>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div 
                className="bg-accentPurple h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${progressPct}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 flex justify-between">
            <span>Started</span>
            <span>{Math.round(progressPct)}%</span>
            <span>Arriving</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LiveTracking;
