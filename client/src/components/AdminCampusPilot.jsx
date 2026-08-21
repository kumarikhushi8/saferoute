import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for Leaflet icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

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
      const response = await fetch(`http://localhost:5000/api/admin/evaluate-point?lat=${latlng.lat}&lng=${latlng.lng}`);
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
    <div className="flex h-screen w-full bg-[#0a0f1d] text-white">
      {/* Sidebar for Controls and Metrics */}
      <div className="w-96 bg-[#151b2b] p-6 shadow-xl z-10 flex flex-col h-full border-r border-[#2a3142]">
        <h1 className="text-2xl font-bold mb-2 text-blue-400">Global Safety Pilot</h1>
        <p className="text-gray-400 text-sm mb-6">Search any real-world location globally and evaluate its safety metrics dynamically.</p>

        {/* Global Search Bar */}
        <div className="mb-6 relative">
          <label className="block text-sm font-medium text-gray-300 mb-2">Search Location</label>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input 
              type="text"
              placeholder="e.g. LSR College, New Delhi..."
              className="w-full bg-[#1e2536] border border-[#2a3142] rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              type="submit"
              disabled={isSearching}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isSearching ? '...' : 'Go'}
            </button>
          </form>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e2536] border border-[#2a3142] rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <div 
                  key={idx}
                  className="p-3 border-b border-[#2a3142] hover:bg-[#2a3142] cursor-pointer text-sm"
                  onClick={() => selectSearchResult(result)}
                >
                  {result.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#1e2536] border border-[#2a3142] rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-300">
            <strong>Instructions:</strong> Click anywhere on the map to drop a pin. The system will dynamically fetch live OSM & NASA data for that exact point.
          </p>
        </div>

        {/* Metrics Display */}
        <div className="flex-1 overflow-y-auto relative">
          {loadingMetrics && (
            <div className="absolute inset-0 bg-[#151b2b]/80 flex flex-col items-center justify-center z-10 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-blue-400 text-sm font-medium animate-pulse">Fetching Live Data...</p>
              <p className="text-gray-500 text-xs mt-2 max-w-[200px] text-center">First time queries might take 1-3 seconds for live satellite analysis.</p>
            </div>
          )}

          {!loadingMetrics && !metrics && !selectedPoint && (
            <div className="text-center text-gray-500 mt-10">
              No point selected. Click the map to begin.
            </div>
          )}

          {metrics && (
            <div className={`space-y-4 ${loadingMetrics ? 'opacity-30 blur-sm' : ''} transition-all duration-300`}>
              <h2 className="text-lg font-semibold text-white mb-4 border-b border-[#2a3142] pb-2">Raw Safety Metrics</h2>
              
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
                color="text-blue-400"
              />

              <div className="mt-6 pt-4 border-t border-[#2a3142]">
                <p className="text-xs text-gray-500">
                  Lat: {selectedPoint?.lat.toFixed(5)}<br/>
                  Lng: {selectedPoint?.lng.toFixed(5)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        <MapContainer 
          center={mapCenter} 
          zoom={mapZoom} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          <MapUpdater center={mapCenter} zoom={mapZoom} />
          <MapClickHandler onMapClick={handleMapClick} />

          {selectedPoint && (
            <Marker position={selectedPoint}>
              <Popup>Selected Point to Evaluate</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

const MetricRow = ({ label, value, description, color }) => (
  <div className="bg-[#151b2b] p-3 rounded border border-[#2a3142]">
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <span className={`text-xl font-bold ${color}`}>{Math.round(value)}</span>
    </div>
    <div className="text-xs text-gray-500">{description}</div>
  </div>
);

export default AdminCampusPilot;
