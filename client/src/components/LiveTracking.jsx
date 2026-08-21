import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

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
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    // For MVP Demo: fetch from local storage
    const storedRoute = localStorage.getItem(`saferoute-${id}`);
    if (storedRoute) {
      try {
        const parsed = JSON.parse(storedRoute);
        // Ensure coordinates exist. OSRM uses [lng, lat], Leaflet uses [lat, lng]
        if (parsed.geometry && parsed.geometry.coordinates) {
          const latLngCoords = parsed.geometry.coordinates.map(coord => [coord[1], coord[0]]);
          setRoute(latLngCoords);
        } else {
          setError('Invalid route data format.');
        }
      } catch (e) {
        setError('Failed to parse route data.');
      }
    } else {
      setError('Live tracking session not found or expired.');
    }
  }, [id]);

  useEffect(() => {
    if (!route || route.length === 0) return;

    // Simulate movement: advance one coordinate every 1.5 seconds
    const interval = setInterval(() => {
      setCurrentPositionIndex(prev => {
        if (prev < route.length - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [route]);

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

  const currentPosition = route[currentPositionIndex];
  const origin = route[0];
  const destination = route[route.length - 1];
  const isArrived = currentPositionIndex === route.length - 1;

  return (
    <div className="min-h-screen flex flex-col h-screen bg-[#0f1424] text-white">
      <header className="bg-[#1a1f35] border-b border-gray-800 p-4 shadow-md z-10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accentPurple flex items-center justify-center font-bold text-lg cursor-pointer" onClick={() => navigate('/')}>
            S
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

          {/* Live Position Marker */}
          <Marker position={currentPosition} icon={UserLiveIcon}>
            <Popup>
              <strong>Live Location</strong><br/>
              {isArrived ? 'Arrived at destination' : 'En route...'}
            </Popup>
          </Marker>
        </MapContainer>
        
        {/* Overlay HUD */}
        <div className="absolute bottom-6 left-6 z-[1000] bg-[#1a1f35]/90 backdrop-blur border border-gray-700 p-4 rounded-lg shadow-xl w-64 pointer-events-none">
          <h3 className="font-bold mb-2">Trip Status</h3>
          <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
            <div className="bg-accentPurple h-2 rounded-full transition-all duration-1000" style={{ width: `${(currentPositionIndex / (route.length - 1)) * 100}%` }}></div>
          </div>
          <div className="text-xs text-gray-400 flex justify-between">
            <span>Started</span>
            <span>{Math.round((currentPositionIndex / (route.length - 1)) * 100)}%</span>
            <span>Arriving</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LiveTracking;
