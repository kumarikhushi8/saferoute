import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LocationInput = ({ label, value, onChange, placeholder, isMapMode, onToggleMap }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Sync external value changes (like when clicking map to set coordinates)
  useEffect(() => {
    // If the value changes from outside (e.g. via map click), and it's a coordinate, just show it
    if (value && value !== query) {
      // Check if it's a raw coordinate (like "77.123,28.123")
      if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(value)) {
        const [lon, lat] = value.split(',');
        setQuery(`📍 Loading name...`);
        // Reverse geocode
        axios.get(`https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}`)
          .then(res => {
            if (res.data.features && res.data.features.length > 0) {
              const props = res.data.features[0].properties;
              const name = [props.name, props.city || props.county, props.state].filter(Boolean).join(', ');
              setQuery(`📍 ${name || value}`);
            } else {
              setQuery(`📍 ${value}`);
            }
          })
          .catch(() => setQuery(`📍 ${value}`));
      } else if (!query) {
        setQuery(value);
      }
    }
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // If query is short, or is already a coordinate format, don't search
      if (!query || query.length < 3 || query.includes('📍')) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        // Using Photon (Komoot) API because Nominatim blocks autocomplete & generic User-Agents
        const res = await axios.get(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
        
        // Map the GeoJSON features into a clean format
        const mappedResults = (res.data.features || []).map(f => {
          const props = f.properties;
          const display_name = [props.name, props.city || props.county, props.state, props.country]
            .filter(Boolean)
            .join(', ');
            
          return {
            display_name,
            lon: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1]
          };
        }).filter(r => r.display_name);
        
        setResults(mappedResults);
        setShowDropdown(true);
      } catch (err) {
        console.error("Geocoding failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result) => {
    // Show just the name (e.g. "Connaught Place") in the input box
    const shortName = result.display_name.split(',').slice(0, 2).join(',');
    setQuery(shortName);
    setShowDropdown(false);
    // backend expects lng,lat
    onChange(`${result.lon},${result.lat}`);
  };

  return (
    <div className="relative">
      <label className="block text-sm text-gray-400 mb-1 font-bold">{label}</label>
      <div className="flex gap-2">
        <div className={`flex-1 relative bg-[#0f1424] border ${isMapMode ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'border-gray-700'} rounded text-white flex items-center transition-all focus-within:border-neonGreen`}>
          <input
            type="text"
            className="w-full bg-transparent p-3 text-sm focus:outline-none text-white placeholder-gray-500"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              // Clear the actual underlying coordinate value if they start typing manually
              if (value && query.includes('📍')) {
                onChange('');
              }
            }}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)} // delay so click works
          />
          {isSearching && <span className="absolute right-3 text-xs text-gray-500 animate-pulse">...</span>}
        </div>
        <button
          type="button"
          onClick={onToggleMap}
          className={`px-3 py-2 rounded font-bold text-xs transition-colors ${isMapMode ? 'bg-green-600 text-white animate-pulse' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
          title="Select on map"
        >
          {isMapMode ? '📍 Click Map' : '🗺️ Map'}
        </button>
      </div>
      
      {/* Autocomplete Dropdown */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 left-0 right-14 top-[100%] mt-1 bg-[#0f1424]/95 backdrop-blur-xl border border-gray-700 rounded-lg shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <div 
              key={i}
              onMouseDown={() => handleSelect(r)}
              className="p-3 border-b border-gray-800 hover:bg-gray-800 cursor-pointer text-sm text-gray-200 transition-colors"
            >
              <div className="font-bold truncate text-white">{r.display_name.split(',')[0]}</div>
              <div className="text-xs text-gray-400 truncate">{r.display_name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RouteSearchBar = ({ onSearch, isLoading, origin, destination, setOrigin, setDestination, mapSelectionMode, setMapSelectionMode }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (origin && destination) {
      onSearch();
    }
  };

  return (
    <div className="bg-[#1a1f35] p-6 rounded-lg shadow-2xl border border-gray-800">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        <LocationInput
          label="Origin"
          placeholder="e.g. Connaught Place"
          value={origin}
          onChange={setOrigin}
          isMapMode={mapSelectionMode === 'origin'}
          onToggleMap={() => setMapSelectionMode(mapSelectionMode === 'origin' ? null : 'origin')}
        />

        <LocationInput
          label="Destination"
          placeholder="e.g. Hauz Khas"
          value={destination}
          onChange={setDestination}
          isMapMode={mapSelectionMode === 'destination'}
          onToggleMap={() => setMapSelectionMode(mapSelectionMode === 'destination' ? null : 'destination')}
        />

        <button 
          type="submit" 
          disabled={isLoading || !origin || !destination}
          className="w-full bg-accentPurple hover:bg-[#6b4deb] text-white font-bold py-3 px-4 rounded-lg transition-colors mt-2 disabled:opacity-50 shadow-lg"
        >
          {isLoading ? 'Calculating Route...' : 'Get Safe Route'}
        </button>
      </form>
    </div>
  );
};

export default RouteSearchBar;
