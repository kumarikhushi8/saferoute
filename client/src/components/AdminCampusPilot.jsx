import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Custom glowing marker for selected point
const CustomPointIcon = L.divIcon({
  className: 'custom-point-marker',
  html: `<div class="w-4 h-4 bg-accentPurple rounded-full shadow-[0_0_15px_rgba(124,92,255,1)] border-2 border-white animate-pulse"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// Component to recenter map when zone changes
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
};

// Component to handle map clicks
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
  return null;
};

const AdminCampusPilot = () => {
  // Default to New Delhi
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]);
  const [mapZoom, setMapZoom] = useState(12);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const [selectedPoint, setSelectedPoint] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Handle Geocoding Search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Failed to search location.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setMapCenter([lat, lon]);
    setMapZoom(15);
    setSearchResults([]);
    setSearchQuery(result.display_name);
    // Auto-evaluate the center point
    handleMapClick({ lat, lng: lon });
  };

  // Handle Point Evaluation
  const handleMapClick = async (latlng) => {
    setSelectedPoint(latlng);
    setLoadingMetrics(true);
    setMetrics(null);

    try {
      const response = await fetch(`/api/admin/evaluate-point?lat=${latlng.lat}&lng=${latlng.lng}`);
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      alert('Failed to fetch metrics. Is the backend running?');
    } finally {
      setLoadingMetrics(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0f1424] font-sans text-white">
      {/* Floating Sidebar for Controls and Metrics */}
      <div className="absolute top-4 left-4 z-[1000] w-96 max-h-[calc(100vh-2rem)] bg-[#1a1f35]/90 backdrop-blur border border-gray-800 p-6 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center text-accentPurple drop-shadow-[0_0_8px_rgba(124,92,255,0.8)]">
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-8 h-8">
              <path d="M50 15 C38.95 15 30 23.95 30 35 C30 50 46.5 68 48.5 70.3 C49.3 71.2 50.7 71.2 51.5 70.3 C53.5 68 70 50 70 35 C70 23.95 61.05 15 50 15 Z M50 45 C44.48 45 40 40.52 40 35 C40 29.48 44.48 25 50 25 C55.52 25 60 29.48 60 35 C60 40.52 55.52 45 50 45 Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Campus Pilot</h1>
        </div>
        <p className="text-gray-400 text-sm mb-6">Search any real-world location globally and evaluate its safety metrics dynamically.</p>

        {/* Global Search Bar */}
        <div className="mb-6 relative">
          <label className="block text-sm font-medium text-gray-300 mb-2">Search Location</label>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input 
              type="text"
              placeholder="e.g. LSR College, New Delhi..."
              className="w-full bg-[#0f1424] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-accentPurple transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              type="submit"
              disabled={isSearching}
              className="bg-accentPurple hover:bg-[#6a4cef] text-white px-4 py-2 rounded font-bold transition-colors disabled:opacity-50"
            >
              {isSearching ? '...' : 'Go'}
            </button>
          </form>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1f35] border border-gray-700 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <div 
                  key={idx}
                  className="p-3 border-b border-gray-800 hover:bg-gray-800 cursor-pointer text-sm text-gray-300"
                  onClick={() => selectSearchResult(result)}
                >
                  {result.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#1a1f35]/50 border border-accentPurple/30 rounded p-4 mb-6">
          <p className="text-sm text-gray-300">
            <strong className="text-accentPurple">Instructions:</strong> Click anywhere on the map to drop a pin. The system will dynamically fetch live OSM & NASA data for that exact point.
          </p>
        </div>

        {/* Scrollable Metrics Area */}
        <div className="flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {loadingMetrics && (
            <div className="flex flex-col items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accentPurple mb-4"></div>
              <p className="text-accentPurple text-sm font-bold animate-pulse">Fetching Live Data...</p>
              <p className="text-gray-500 text-xs mt-2 max-w-[200px] text-center">First time queries might take 1-3 seconds for live satellite analysis.</p>
            </div>
          )}

          {!loadingMetrics && !metrics && !selectedPoint && (
            <div className="text-center text-gray-500 mt-10">
              No point selected. Click the map to begin.
            </div>
          )}

          {metrics && (
            <div className="space-y-4 transition-all duration-300">
              <h2 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Raw Safety Metrics</h2>
              
              <MetricRow 
                label="NASA GIBS Lighting" 
                value={metrics.lighting_score} 
                description="Avg pixel brightness (0-100)"
                color="text-yellow-400"
              />
              <MetricRow 
                label="OSM Crowd Density" 
                value={metrics.crowd_density_score} 
                description={`Based on ${metrics.poiCount || 0} nearby POIs & Time-of-Day`}
                color="text-green-400"
              />
              <MetricRow 
                label="Historical Crime Index" 
                value={metrics.crime_incidence_score} 
                description="Nearest neighbor NCRB proxy"
                color="text-red-400"
              />
              <MetricRow 
                label="Police/CCTV Proximity" 
                value={metrics.cctv_police_proximity_score} 
                description="OSM amenity=police proximity"
                color="text-accentPurple"
              />

              <div className="mt-6 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500">
                  Lat: {selectedPoint?.lat.toFixed(5)}<br/>
                  Lng: {selectedPoint?.lng.toFixed(5)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Map Area */}
      <div className="absolute inset-0 z-0">
        <MapContainer 
          center={mapCenter} 
          zoom={mapZoom} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          <MapUpdater center={mapCenter} zoom={mapZoom} />
          <MapClickHandler onMapClick={handleMapClick} />

          {selectedPoint && (
            <Marker position={selectedPoint} icon={CustomPointIcon}>
              <Popup className="custom-popup">
                <div className="font-bold text-accentPurple">Evaluated Point</div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

const MetricRow = ({ label, value, description, color }) => (
  <div className="bg-[#0f1424]/50 p-3 rounded border border-gray-800 hover:border-accentPurple/50 transition-colors">
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm font-bold text-gray-300">{label}</span>
      <span className={`text-xl font-bold drop-shadow-md ${color}`}>{Math.round(value)}</span>
    </div>
    <div className="text-xs text-gray-500">{description}</div>
  </div>
);

export default AdminCampusPilot;
