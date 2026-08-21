import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
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

const MapView = ({ routesData, activeRouteMode }) => {
  // Default center: Somewhere like NYC or just [40.7128, -74.0060]
  const defaultCenter = [40.7128, -74.0060];

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-gray-800 shadow-xl">
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
      </MapContainer>
    </div>
  );
};

export default MapView;
