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

const ZONES = [
  {
    name: 'IIT Delhi (Public Campus)',
    center: [28.545, 77.195],
    zoom: 15
  },
  {
    name: 'Amity University, Noida (Private College)',
    center: [28.545, 77.335],
    zoom: 16
  },
  {
    name: 'Okhla Industrial Area Phase 1 (Industrial)',
    center: [28.530, 77.280],
    zoom: 15
  },
  {
    name: 'Sanjay Van (Forested/Isolated)',
    center: [28.532, 77.172],
    zoom: 15
  }
];

// Component to recenter map when zone changes
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
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
  const [activeZoneIndex, setActiveZoneIndex] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeZone = ZONES[activeZoneIndex];

  const handleMapClick = async (latlng) => {
    setSelectedPoint(latlng);
    setLoading(true);
    setMetrics(null);

    try {
      const response = await fetch(`http://localhost:5000/api/admin/evaluate-point?lat=${latlng.lat}&lng=${latlng.lng}`);
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      alert('Failed to fetch metrics. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0f1d] text-white">
      {/* Sidebar for Controls and Metrics */}
      <div className="w-96 bg-[#151b2b] p-6 shadow-xl z-10 flex flex-col h-full border-r border-[#2a3142]">
        <h1 className="text-2xl font-bold mb-2 text-blue-400">Phase 2 Pilot</h1>
        <p className="text-gray-400 text-sm mb-6">Admin interface to validate Safety Score Engine predictions across diverse terrains.</p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Test Zone</label>
          <select 
            className="w-full bg-[#1e2536] border border-[#2a3142] rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={activeZoneIndex}
            onChange={(e) => {
              setActiveZoneIndex(parseInt(e.target.value));
              setSelectedPoint(null);
              setMetrics(null);
            }}
          >
            {ZONES.map((zone, idx) => (
              <option key={idx} value={idx}>{zone.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-[#1e2536] border border-[#2a3142] rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-300">
            <strong>Instructions:</strong> Click anywhere on the map to drop a pin. The system will run the exact point through the <code>safetyScoreEngine</code> and return the unweighted raw metrics.
          </p>
        </div>

        {/* Metrics Display */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!loading && !metrics && !selectedPoint && (
            <div className="text-center text-gray-500 mt-10">
              No point selected. Click the map to begin.
            </div>
          )}

          {!loading && metrics && (
            <div className="space-y-4">
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
          center={activeZone.center} 
          zoom={activeZone.zoom} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          <MapUpdater center={activeZone.center} zoom={activeZone.zoom} />
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
