import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MapView from './MapView';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.DEV ? `http://${window.location.hostname}:5000` : undefined);
import RouteSearchBar from './RouteSearchBar';

function MainApp() {
  const [routesData, setRoutesData] = useState(null);
  const [activeRouteMode, setActiveRouteMode] = useState('safest'); // 'safest' or 'fastest'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Route Selection State
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [mapSelectionMode, setMapSelectionMode] = useState(null); // 'origin' | 'destination' | 'report' | null

  // Community Reporting State
  const [liveReports, setLiveReports] = useState([]);

  // Heatmap State
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapZones, setHeatmapZones] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);

  // SOS State
  const [isSosActive, setIsSosActive] = useState(false);

  // Tracking Share Link
  const [shareLink, setShareLink] = useState('');

  // User and Contacts State
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('saferoute-user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [contacts, setContacts] = useState(() => {
    const storedUser = localStorage.getItem('saferoute-user');
    return storedUser ? (JSON.parse(storedUser).emergencyContacts || []) : [];
  });
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [showContactsPanel, setShowContactsPanel] = useState(false);

  const fetchReports = async () => {
    try {
      const response = await axios.get('/api/reports');
      setLiveReports(response.data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  };

  const toggleHeatmap = async () => {
    if (!showHeatmap) {
      try {
        let url = '/api/heatmap';
        if (mapBounds) {
          url += `?minLat=${mapBounds.minLat}&maxLat=${mapBounds.maxLat}&minLng=${mapBounds.minLng}&maxLng=${mapBounds.maxLng}`;
        }
        const response = await axios.get(url);
        setHeatmapZones(response.data);
      } catch (err) {
        if (err.response && err.response.status === 400) {
          alert("Map area is too large to fetch live Night Risk data. Please zoom in closer!");
        } else {
          console.error('Failed to fetch heatmap data:', err);
        }
        return; // Don't turn it on if it fails
      }
    }
    setShowHeatmap(!showHeatmap);
  };

  // Whenever map is dragged or zoomed, and heatmap is active, we could re-fetch
  // Added a debounce to prevent API spam and rate limits
  useEffect(() => {
    if (showHeatmap && mapBounds && !isLoading) {
      const delayFetch = setTimeout(() => {
        axios.get(`/api/heatmap?minLat=${mapBounds.minLat}&maxLat=${mapBounds.maxLat}&minLng=${mapBounds.minLng}&maxLng=${mapBounds.maxLng}`)
          .then(res => setHeatmapZones(res.data))
          .catch(err => {
            if (err.response && err.response.status === 400) {
              setHeatmapZones([]); // clear zones if too zoomed out
            }
          });
      }, 1000); // 1 second debounce

      return () => clearTimeout(delayFetch);
    }
  }, [mapBounds, showHeatmap, isLoading]);

  const handleSOS = async () => {
    setIsSosActive(true);
    
    // Generate tracking URL and mock the active route to local storage for the Live Tracking MVP
    const trackingId = 'sos-' + Math.random().toString(36).substr(2, 6);
    const trackingUrl = `${window.location.origin}/track/${trackingId}`;
    
    let activeRouteGeoJSON = { geometry: { coordinates: [] } };
    if (routesData && routesData[activeRouteMode]) {
      activeRouteGeoJSON = routesData[activeRouteMode];
    }
    
    socket.emit('start_tracking', {
      trackingId,
      route: activeRouteGeoJSON
    });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        try {
          await axios.post('/api/sos', { lat, lng, userId: user?.id, trackingUrl });
          alert(`🚨 SOS TRIGGERED 🚨\n\nYour live location has been shared with your Emergency Contacts!\n\nLink: ${trackingUrl}`);
          
          // Send initial location
          socket.emit('location_update', {
            trackingId,
            position: [lat, lng],
            index: 0
          });
          
          // Start watching user's real GPS position for the SOS live feed
          if (window.liveTrackingWatcher) navigator.geolocation.clearWatch(window.liveTrackingWatcher);
          
          window.liveTrackingWatcher = navigator.geolocation.watchPosition(
            (newPos) => {
              socket.emit('location_update', {
                trackingId,
                position: [newPos.coords.latitude, newPos.coords.longitude],
                index: 0
              });
            },
            (error) => console.error("Error watching SOS position:", error),
            { enableHighAccuracy: true, maximumAge: 0 }
          );
        } catch (err) {
          console.error('Failed to trigger SOS:', err);
          alert('Failed to connect to SOS service.');
        } finally {
          setTimeout(() => setIsSosActive(false), 2000);
        }
      },
      (error) => {
        console.error("Error getting location: ", error);
        alert("Could not get your location for SOS.");
        setIsSosActive(false);
      }
    );
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchReports());
    const localUser = JSON.parse(localStorage.getItem('saferoute-user'));
    if (localUser) {
      const token = localStorage.getItem('saferoute-token');
      axios.get(`/api/user/${localUser.id}/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setContacts(res.data))
      .catch(err => console.error("Error fetching contacts", err));
    }
  }, []);

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!user || !newContactName || !newContactPhone) return;
    try {
      const token = localStorage.getItem('saferoute-token');
      const res = await axios.post(`/api/user/${user.id}/contacts`, 
        { name: newContactName, phone: newContactPhone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContacts(res.data);
      const updatedUser = { ...user, emergencyContacts: res.data };
      setUser(updatedUser);
      localStorage.setItem('saferoute-user', JSON.stringify(updatedUser));
      setNewContactName('');
      setNewContactPhone('');
    } catch (err) {
      console.error(err);
      alert("Failed to add contact");
    }
  };

  const handleMapClick = async (latlng) => {
    if (mapSelectionMode === 'origin') {
      setOrigin(`${latlng.lng.toFixed(5)},${latlng.lat.toFixed(5)}`);
      setMapSelectionMode(null);
      return;
    }
    if (mapSelectionMode === 'destination') {
      setDestination(`${latlng.lng.toFixed(5)},${latlng.lat.toFixed(5)}`);
      setMapSelectionMode(null);
      return;
    }

    if (mapSelectionMode !== 'report') return;
    
    const reason = window.prompt("What makes this spot unsafe? (e.g. 'Poor lighting', 'Suspicious activity')");
    if (!reason) {
      setMapSelectionMode(null);
      return;
    }
    
    try {
      await axios.post('/api/reports', {
        lat: latlng.lat,
        lng: latlng.lng,
        reason
      });
      fetchReports();
      
      // Real-time recalculation: immediately update the active route scores if a route exists
      if (routesData && origin && destination) {
        handleSearch(origin, destination);
      } else {
        alert('Hazard reported!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit report.');
    } finally {
      setMapSelectionMode(null);
    }
  };

  const handleSearch = async (origin, destination) => {
    setIsLoading(true);
    setError('');
    setRoutesData(null);
    setHeatmapZones([]);
    setShareLink('');
    
    try {
      const response = await axios.post('/api/route', {
        origin,
        destination
      });
      
      if (response.data && response.data.fastest && response.data.safest) {
        setRoutesData({
          fastest: response.data.fastest,
          safest: response.data.safest
        });
        
        // Immediately load the heatmap data fetched alongside the route
        if (response.data.heatmapZones) {
          setHeatmapZones(response.data.heatmapZones);
        }
        
        // Automatically enable heatmap visualization along the new route
        setShowHeatmap(true);
      } else {
        setError('Received invalid route data from server.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch route. Is the server running?');
    } finally {
      setIsLoading(false);
    }
  };

  const shareLiveLocation = () => {
    if (!routesData) return;
    
    // Generate a mock tracking ID
    const trackingId = 'trk-' + Math.random().toString(36).substr(2, 6);
    
    // Extract the active route coordinates. Note: Backend provides [lng, lat], Leaflet wants [lat, lng].
    // Wait, the backend provides [lng, lat] for OSRM, but wait, LiveTracking.jsx currently expects parsed.geometry.coordinates to be [lng, lat] and maps it to [lat, lng].
    // So let's send the exact raw geometry array.
    const activeRouteGeoJSON = routesData[activeRouteMode];
    
    // Connect to WebSocket server and broadcast the route
    socket.emit('start_tracking', {
      trackingId,
      route: activeRouteGeoJSON
    });
    
    // Watch the user's real GPS position and broadcast it to the server
    if (window.liveTrackingWatcher) navigator.geolocation.clearWatch(window.liveTrackingWatcher);
    
    window.liveTrackingWatcher = navigator.geolocation.watchPosition(
      (position) => {
        socket.emit('location_update', {
          trackingId,
          position: [position.coords.latitude, position.coords.longitude],
          index: 0
        });
      },
      (error) => console.error("Error watching position:", error),
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    const link = `${window.location.origin}/track/${trackingId}`;
    setShareLink(link);
    navigator.clipboard.writeText(link).catch(() => {});
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0f1424] font-sans text-white">
      
      {/* 🗺️ FULL SCREEN MAP LAYER */}
      <div className="absolute inset-0 z-0">
        <MapView 
          routesData={routesData} 
          activeRouteMode={activeRouteMode} 
          liveReports={liveReports}
          mapSelectionMode={mapSelectionMode}
          onMapClick={handleMapClick}
          showHeatmap={showHeatmap}
          heatmapZones={heatmapZones}
          origin={origin}
          destination={destination}
          onBoundsChange={setMapBounds}
          isLoading={isLoading}
        />
      </div>
      
      {/* 🧭 TOP FLOATING NAVIGATION LAYER */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 sm:p-6 pointer-events-none flex justify-between items-start">
        
        {/* Top Left: Logo Block */}
        <div className="pointer-events-auto bg-[#0f1424]/80 backdrop-blur-xl border border-gray-800/80 p-3 pr-5 rounded-2xl shadow-2xl flex items-center gap-3">
          <div className="text-neonGreen drop-shadow-[0_0_8px_rgba(46,204,113,0.6)]">
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-8 h-8">
              <defs>
                <mask id="map-cutout-main">
                  <rect x="0" y="0" width="100" height="100" fill="white" />
                  <path d="M10 70 Q 30 75 50 65 T 90 60" fill="none" stroke="black" strokeWidth="4" />
                  <path d="M50 15 C38.95 15 30 23.95 30 35 C30 50 46.5 68 48.5 70.3 C49.3 71.2 50.7 71.2 51.5 70.3 C53.5 68 70 50 70 35 C70 23.95 61.05 15 50 15 Z" fill="black" stroke="black" strokeWidth="3" strokeLinejoin="round" />
                </mask>
              </defs>
              <polygon points="26,55 48,55 48,85 15,85" mask="url(#map-cutout-main)" />
              <polygon points="52,55 74,55 85,85 52,85" mask="url(#map-cutout-main)" />
              <path d="M50 15 C38.95 15 30 23.95 30 35 C30 50 46.5 68 48.5 70.3 C49.3 71.2 50.7 71.2 51.5 70.3 C53.5 68 70 50 70 35 C70 23.95 61.05 15 50 15 Z M50 45 C44.48 45 40 40.52 40 35 C40 29.48 44.48 25 50 25 C55.52 25 60 29.48 60 35 C60 40.52 55.52 45 50 45 Z" />
            </svg>
          </div>
          <h1 className="text-xl font-black tracking-wider text-white">SafeRoute</h1>
        </div>

        {/* Top Center: Action Pill */}
        <div className="hidden md:flex pointer-events-auto bg-[#0f1424]/80 backdrop-blur-xl border border-gray-800/80 p-2 rounded-full shadow-2xl items-center gap-2">
          <button 
            onClick={handleSOS}
            className={`px-8 py-2 rounded-full font-bold shadow-lg transition-all uppercase tracking-wider text-sm ${isSosActive ? 'bg-red-700 animate-pulse scale-105 text-white' : 'bg-red-600 hover:bg-red-500 hover:scale-105 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'}`}
          >
            🚨 SOS
          </button>
          <div className="w-px h-6 bg-gray-700 mx-2"></div>
          <button 
            onClick={() => setMapSelectionMode(mapSelectionMode === 'report' ? null : 'report')}
            className={`px-5 py-2 rounded-full font-bold text-sm transition-colors ${mapSelectionMode === 'report' ? 'bg-accentYellow text-black' : 'text-gray-300 hover:text-white hover:bg-gray-800/50'}`}
          >
            {mapSelectionMode === 'report' ? 'Cancel Reporting' : '📍 Report Hazard'}
          </button>
          <button 
            onClick={toggleHeatmap}
            className={`px-5 py-2 rounded-full font-bold text-sm transition-colors ${showHeatmap ? 'bg-accentPurple text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800/50'}`}
          >
            {showHeatmap ? 'Hide Risk Map' : '🌙 Night Risk'}
          </button>
        </div>

        {/* Top Right: User Profile */}
        <div className="pointer-events-auto flex flex-col items-end relative">
          <button 
            onClick={() => setShowContactsPanel(!showContactsPanel)}
            className="bg-[#0f1424]/80 backdrop-blur-xl border border-gray-800/80 p-2 pr-4 rounded-full shadow-2xl flex items-center gap-3 hover:border-neonGreen/50 transition-colors group"
          >
            <div className="bg-gradient-to-tr from-neonGreen to-green-300 text-black font-black w-10 h-10 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(46,204,113,0.5)]">
              {user ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm leading-tight text-white group-hover:text-neonGreen transition-colors">{user ? user.name : 'Guest User'}</span>
              <span className="text-xs text-gray-400 font-medium">{contacts.length} Contacts</span>
            </div>
          </button>

          {/* Contacts Dropdown Panel */}
          {showContactsPanel && user && (
            <div className="absolute top-16 right-0 w-80 bg-[#0f1424]/95 backdrop-blur-3xl border border-gray-700 rounded-2xl shadow-2xl p-5 overflow-hidden animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-200">Emergency Contacts</h3>
                <span className="text-xs bg-gray-800/80 text-gray-300 px-2 py-1 rounded-full">{contacts.length} / 5</span>
              </div>
              
              <form onSubmit={handleAddContact} className="flex gap-2 mb-4">
                <input type="text" placeholder="Name" value={newContactName} onChange={e => setNewContactName(e.target.value)} className="bg-[#1a1f35] border border-gray-700 text-sm px-3 py-2 rounded-lg w-full focus:outline-none focus:border-neonGreen text-white placeholder-gray-500" required />
                <input type="text" placeholder="Phone" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} className="bg-[#1a1f35] border border-gray-700 text-sm px-3 py-2 rounded-lg w-full focus:outline-none focus:border-neonGreen text-white placeholder-gray-500" required />
                <button type="submit" className="bg-neonGreen hover:bg-green-400 text-black font-bold text-sm px-4 rounded-lg transition-colors">+</button>
              </form>
              
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {contacts.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4 bg-[#1a1f35]/50 rounded-lg border border-gray-800 border-dashed">No contacts added yet.</div>
                ) : contacts.map((c, i) => (
                  <div key={i} className="text-sm bg-[#1a1f35] p-3 rounded-xl flex justify-between items-center border border-gray-800/80 hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 text-xs font-bold">{c.name.charAt(0)}</div>
                      <span className="font-bold text-gray-200">{c.name}</span>
                    </div>
                    <span className="text-gray-400 font-mono text-xs">{c.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 🔍 FLOATING SEARCH CARD (Left Side) */}
      <div className="absolute top-28 left-4 sm:left-6 z-10 w-80 pointer-events-auto">
        <div className="bg-[#0f1424]/80 backdrop-blur-xl border border-gray-800/80 p-5 rounded-2xl shadow-2xl">
          <h2 className="text-xl font-bold mb-4 text-white">Find <span className="text-neonGreen">Safe</span>Route</h2>
          
          <RouteSearchBar 
            onSearch={() => handleSearch(origin, destination)} 
            isLoading={isLoading} 
            origin={origin}
            destination={destination}
            setOrigin={setOrigin}
            setDestination={setDestination}
            mapSelectionMode={mapSelectionMode}
            setMapSelectionMode={setMapSelectionMode}
          />
          
          {error && (
            <div className="mt-4 bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {mapSelectionMode && (
            <div className="mt-4 bg-accentYellow/20 border border-accentYellow/50 text-accentYellow p-3 rounded-lg text-sm animate-pulse text-center font-medium">
              📍 Click anywhere on the map to drop a pin
            </div>
          )}
        </div>

        {/* Mobile Action Buttons (Visible only on small screens) */}
        <div className="md:hidden flex gap-2 mt-4">
          <button onClick={handleSOS} className="flex-1 bg-red-600 rounded-xl py-3 font-bold text-white shadow-lg">SOS</button>
          <button onClick={() => setMapSelectionMode(mapSelectionMode === 'report' ? null : 'report')} className="flex-1 bg-gray-800/80 backdrop-blur rounded-xl py-3 font-bold text-white shadow-lg text-sm">Report</button>
        </div>
      </div>

      {/* 📊 BOTTOM DASHBOARD PANEL */}
      {routesData && (
        <div className="absolute bottom-4 sm:bottom-6 left-4 right-4 z-10 pointer-events-auto">
          <div className="bg-[#0f1424]/90 backdrop-blur-2xl border border-gray-800/80 rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-4 sm:p-6 flex gap-4 sm:gap-6 overflow-x-auto custom-scrollbar items-stretch snap-x">
            
            {/* Navigational Info Card */}
            <div className="flex-shrink-0 w-64 bg-gradient-to-b from-[#1a1f35] to-[#0f1424] rounded-2xl p-5 border border-gray-700/50 flex flex-col justify-between relative snap-center">
              <div className="absolute top-4 right-4 bg-accentYellow text-black text-[10px] font-black uppercase px-2 py-1 rounded-full tracking-widest shadow-lg">Active</div>
              <div>
                <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Route Status</div>
                <div className="font-bold text-lg text-white mb-4">Navigating...</div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Mode</span>
                    <span className="text-white font-medium capitalize">{activeRouteMode}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={shareLiveLocation} 
                className="mt-6 w-full bg-[#2a2f4c] hover:bg-accentPurple text-white text-sm font-bold py-3 rounded-xl transition-colors border border-gray-600 hover:border-purple-400 shadow-lg flex items-center justify-center gap-2"
              >
                📡 Share Link
              </button>
              {shareLink && <div className="mt-2 text-center text-[10px] text-neonGreen font-mono break-all">{shareLink}</div>}
            </div>

            {/* Safest Route Card */}
            <div 
              onClick={() => setActiveRouteMode('safest')}
              className={`flex-shrink-0 w-72 rounded-2xl p-5 border cursor-pointer transition-all duration-300 flex flex-col justify-between snap-center relative overflow-hidden ${
                activeRouteMode === 'safest' 
                  ? 'bg-gradient-to-br from-green-900/40 to-[#0f1424] border-neonGreen shadow-[0_0_30px_rgba(46,204,113,0.15)] scale-[1.02]' 
                  : 'bg-[#1a1f35]/60 border-gray-700/50 hover:border-gray-500'
              }`}
            >
              {activeRouteMode === 'safest' && <div className="absolute top-0 left-0 w-full h-1 bg-neonGreen"></div>}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-black text-white text-lg tracking-wide mb-1">🛡️ Safest</h3>
                  <div className="text-xs text-green-400 font-bold uppercase tracking-widest">Recommended</div>
                </div>
                <div className="text-right flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white tracking-tighter">{routesData.safest.score}</span>
                  <span className="text-sm font-bold text-gray-500">/100</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0f1424]/50 rounded-xl p-3 border border-gray-800">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">ETA</div>
                  <div className="text-xl font-bold text-white">{Math.round(routesData.safest.duration / 60)}<span className="text-sm text-gray-400 font-medium ml-1">min</span></div>
                </div>
                <div className="bg-[#0f1424]/50 rounded-xl p-3 border border-gray-800">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Distance</div>
                  <div className="text-xl font-bold text-white">{Math.round(routesData.safest.distance / 1000)}<span className="text-sm text-gray-400 font-medium ml-1">km</span></div>
                </div>
              </div>
            </div>

            {/* Fastest Route Card */}
            <div 
              onClick={() => setActiveRouteMode('fastest')}
              className={`flex-shrink-0 w-72 rounded-2xl p-5 border cursor-pointer transition-all duration-300 flex flex-col justify-between snap-center relative overflow-hidden ${
                activeRouteMode === 'fastest' 
                  ? 'bg-gradient-to-br from-blue-900/40 to-[#0f1424] border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.15)] scale-[1.02]' 
                  : 'bg-[#1a1f35]/60 border-gray-700/50 hover:border-gray-500'
              }`}
            >
              {activeRouteMode === 'fastest' && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-black text-white text-lg tracking-wide mb-1">⚡ Fastest</h3>
                  <div className="text-xs text-blue-400 font-bold uppercase tracking-widest">Time saving</div>
                </div>
                <div className="text-right flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white tracking-tighter">{routesData.fastest.score}</span>
                  <span className="text-sm font-bold text-gray-500">/100</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0f1424]/50 rounded-xl p-3 border border-gray-800">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">ETA</div>
                  <div className="text-xl font-bold text-white">{Math.round(routesData.fastest.duration / 60)}<span className="text-sm text-gray-400 font-medium ml-1">min</span></div>
                </div>
                <div className="bg-[#0f1424]/50 rounded-xl p-3 border border-gray-800">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Distance</div>
                  <div className="text-xl font-bold text-white">{Math.round(routesData.fastest.distance / 1000)}<span className="text-sm text-gray-400 font-medium ml-1">km</span></div>
                </div>
              </div>
            </div>

            {/* AI Summary Card */}
            <div className="flex-shrink-0 w-80 lg:flex-grow bg-[#1a1f35]/60 rounded-2xl p-5 border border-gray-700/50 flex flex-col snap-center relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-6xl opacity-10">✨</div>
              <div className="text-[10px] text-accentPurple font-black uppercase tracking-widest flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-accentPurple animate-pulse"></span>
                AI Route Intelligence
              </div>
              <p className="text-sm text-gray-300 leading-relaxed font-medium mt-2">
                {activeRouteMode === 'safest' ? routesData.safest.summary : routesData.fastest.summary}
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default MainApp;
