import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';

// Fix for default Leaflet icon missing issues in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;
L.Marker.prototype.options.icon = DefaultIcon;

// Custom red icon for reports
const reportIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map clicks
const MapClickHandler = ({ onMapClick, mapSelectionMode }) => {
  const map = useMapEvents({
    click(e) {
      if (mapSelectionMode && onMapClick) {
        onMapClick(e.latlng);
      }
    }
  });
  
  useEffect(() => {
    if (mapSelectionMode) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }
  }, [mapSelectionMode, map]);

  return null;
};

// Component to recenter map when route changes
const MapRecenter = ({ routeGeoJSON }) => {
  const map = useMap();
  useEffect(() => {
    if (routeGeoJSON) {
      const geoJsonLayer = L.geoJSON(routeGeoJSON);
      map.fitBounds(geoJsonLayer.getBounds(), { padding: [50, 50] });
    }
  }, [routeGeoJSON, map]);
  return null;
};

const MapView = ({ routesData, activeRouteMode, liveReports = [], mapSelectionMode, onMapClick, showHeatmap = false, heatmapZones = [], origin, destination }) => {
  // Default center: Somewhere like NYC or just [40.7128, -74.0060]
  const defaultCenter = [40.7128, -74.0060];

  return (
    <div className="h-full w-full bg-[#0f1424]">
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        {/* Dark theme styled map tiles (CartoDB Dark Matter) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {routesData && routesData.fastest && (
          <GeoJSON 
            key={`fastest-${activeRouteMode === 'fastest'}`}
            data={routesData.fastest.geometry} 
            pathOptions={{ 
              color: '#3b82f6', // blue
              weight: activeRouteMode === 'fastest' ? 6 : 4, 
              opacity: activeRouteMode === 'fastest' ? 0.9 : 0.3 
            }} 
          />
        )}

        {routesData && routesData.safest && (
          <GeoJSON 
            key={`safest-${activeRouteMode === 'safest'}`}
            data={routesData.safest.geometry} 
            pathOptions={{ 
              color: '#22c55e', // green
              weight: activeRouteMode === 'safest' ? 6 : 4, 
              opacity: activeRouteMode === 'safest' ? 0.9 : 0.3 
            }} 
          />
        )}
        
        {routesData && (
          <MapRecenter routeGeoJSON={routesData[activeRouteMode]?.geometry} />
        )}

        <MapClickHandler onMapClick={onMapClick} mapSelectionMode={mapSelectionMode} />

        {/* Origin Marker */}
        {origin && (
          <Marker position={[parseFloat(origin.split(',')[1]), parseFloat(origin.split(',')[0])]} />
        )}

        {/* Destination Marker */}
        {destination && (
          <Marker position={[parseFloat(destination.split(',')[1]), parseFloat(destination.split(',')[0])]} />
        )}

        {/* Render Night Risk Heatmap */}
        {showHeatmap && heatmapZones.map((zone, idx) => (
          <Circle
            key={`heatmap-${idx}`}
            center={[zone.coordinates[1], zone.coordinates[0]]}
            radius={zone.radiusKm * 1000}
            pathOptions={{
              color: 'transparent',
              fillColor: '#ff3300',
              fillOpacity: 0.35
            }}
          />
        ))}

        {/* Render Live Reports */}
        {liveReports.map((report) => (
          <Marker 
            key={report._id} 
            position={[report.location.coordinates[1], report.location.coordinates[0]]}
            icon={reportIcon}
          >
            <Popup>
              <strong>Community Report</strong><br />
              {report.reason}<br />
              <span className="text-xs text-gray-500">{new Date(report.createdAt).toLocaleDateString()}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
