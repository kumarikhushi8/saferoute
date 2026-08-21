import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MapView from './MapView';
import RouteSearchBar from './RouteSearchBar';
import { useNavigate } from 'react-router-dom';

function MainApp() {
  const [routesData, setRoutesData] = useState(null);
  const [activeRouteMode, setActiveRouteMode] = useState('safest'); // 'safest' or 'fastest'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Community Reporting State
  const [liveReports, setLiveReports] = useState([]);
  const [isReportMode, setIsReportMode] = useState(false);

  // Heatmap State
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapZones, setHeatmapZones] = useState([]);

  // SOS State
  const [isSosActive, setIsSosActive] = useState(false);

  // Tracking Share Link
  const [shareLink, setShareLink] = useState('');

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
        const response = await axios.get('/api/heatmap');
        setHeatmapZones(response.data);
      } catch (err) {
        console.error('Failed to fetch heatmap data:', err);
      }
    }
    setShowHeatmap(!showHeatmap);
  };

  const handleSOS = async () => {
    setIsSosActive(true);
    try {
      const lat = 40.758;
      const lng = -73.985;
      
      await axios.post('/api/sos', { lat, lng });
      alert('🚨 SOS TRIGGERED 🚨\n\nYour live location has been shared with your Emergency Contacts!');
    } catch (err) {
      console.error('Failed to trigger SOS:', err);
      alert('Failed to connect to SOS service.');
    } finally {
      setTimeout(() => setIsSosActive(false), 2000);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleMapClick = async (latlng) => {
    if (!isReportMode) return;
    
    const reason = window.prompt("What makes this spot unsafe? (e.g. 'Poor lighting', 'Suspicious activity')");
    if (!reason) {
      setIsReportMode(false);
      return;
    }
    
    try {
      await axios.post('/api/reports', {
        lat: latlng.lat,
        lng: latlng.lng,
        reason
      });
      alert('Report submitted! Re-fetch your route to see the safety score update.');
      fetchReports();
    } catch (err) {
      alert('Failed to submit report.');
    } finally {
      setIsReportMode(false);
    }
  };

  const handleSearch = async (origin, destination) => {
    setIsLoading(true);
    setError('');
    setRoutesData(null);
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
    // Persist route to local storage for the demo tracking page to pick up
    localStorage.setItem(`saferoute-${trackingId}`, JSON.stringify(routesData[activeRouteMode]));
    
    const link = `${window.location.origin}/track/${trackingId}`;
    setShareLink(link);
    navigator.clipboard.writeText(link).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col font-sans">
      <header className="bg-[#1a1f35] border-b border-gray-800 p-4 shadow-md z-10 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accentPurple flex items-center justify-center font-bold text-lg">
              S
            </div>
            <h1 className="text-2xl font-bold">SafeRoute</h1>
          </div>
          
          <button 
            onClick={handleSOS}
            className={`px-6 py-2 rounded-full font-bold shadow-lg transition-all ${isSosActive ? 'bg-red-700 animate-pulse scale-105' : 'bg-red-600 hover:bg-red-500 hover:scale-105'}`}
          >
            🚨 SOS
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col md:flex-row relative z-0">
        <div className="w-full md:w-[400px] p-6 flex flex-col gap-6 z-10 bg-background/95 backdrop-blur shadow-2xl border-r border-gray-800">
          <div>
            <h2 className="text-3xl font-bold mb-2">Navigate <span className="text-accentYellow">Safely</span></h2>
            <p className="text-gray-400 text-sm">
              Find the optimal path balancing speed and safety across the city.
            </p>
          </div>
          
          <RouteSearchBar onSearch={handleSearch} isLoading={isLoading} />
          
          <div className="flex flex-col gap-3">
            {/* Report Mode Toggle */}
            <div className="bg-[#1a1f35] p-4 rounded-lg border border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-red-400">Community Reporting</h3>
                <p className="text-xs text-gray-400 mt-1">See something unsafe?</p>
              </div>
              <button 
                onClick={() => setIsReportMode(!isReportMode)}
                className={`px-4 py-2 rounded font-bold text-sm transition-colors ${isReportMode ? 'bg-red-500 text-white' : 'bg-red-900/30 text-red-300 border border-red-800 hover:bg-red-900/50'}`}
              >
                {isReportMode ? 'Cancel' : 'Report Spot'}
              </button>
            </div>

            {/* Night Risk Heatmap Toggle */}
            <div className="bg-[#1a1f35] p-4 rounded-lg border border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-orange-400">Night Risk Overlay</h3>
                <p className="text-xs text-gray-400 mt-1">Show high-risk areas.</p>
              </div>
              <button 
                onClick={toggleHeatmap}
                className={`px-4 py-2 rounded font-bold text-sm transition-colors ${showHeatmap ? 'bg-orange-500 text-white' : 'bg-orange-900/30 text-orange-300 border border-orange-800 hover:bg-orange-900/50'}`}
              >
                {showHeatmap ? 'Hide' : 'Show Map'}
              </button>
            </div>
          </div>
          
          {isReportMode && (
            <div className="bg-yellow-900/40 border border-yellow-600 text-yellow-200 p-3 rounded text-sm animate-pulse">
              Click anywhere on the map to flag an unsafe location.
            </div>
          )}
          
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded">
              {error}
            </div>
          )}

          {routesData && (
            <div className="flex flex-col gap-3">
              {/* Safest Route Badge */}
              <div 
                className={`p-4 rounded border cursor-pointer transition-colors ${activeRouteMode === 'safest' ? 'bg-green-900/40 border-green-500' : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'}`}
                onClick={() => setActiveRouteMode('safest')}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-green-400">🛡️ Safest Route</h3>
                  <span className="text-xl font-black text-green-300">{routesData.safest.score}<span className="text-sm font-normal text-green-500">/100</span></span>
                </div>
                <div className="text-xs text-gray-400 flex justify-between">
                  <span>~{Math.round(routesData.safest.duration / 60)} mins</span>
                  <span>{Math.round(routesData.safest.distance / 1000)} km</span>
                </div>
              </div>

              {/* Fastest Route Badge */}
              <div 
                className={`p-4 rounded border cursor-pointer transition-colors ${activeRouteMode === 'fastest' ? 'bg-blue-900/40 border-blue-500' : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'}`}
                onClick={() => setActiveRouteMode('fastest')}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-blue-400">⚡ Fastest Route</h3>
                  <span className="text-xl font-black text-blue-300">{routesData.fastest.score}<span className="text-sm font-normal text-blue-500">/100</span></span>
                </div>
                <div className="text-xs text-gray-400 flex justify-between">
                  <span>~{Math.round(routesData.fastest.duration / 60)} mins</span>
                  <span>{Math.round(routesData.fastest.distance / 1000)} km</span>
                </div>
              </div>

              <div className="mt-2">
                <button 
                  onClick={shareLiveLocation}
                  className="w-full bg-accentPurple hover:bg-purple-600 text-white font-bold py-3 px-4 rounded transition-colors flex items-center justify-center gap-2"
                >
                  📡 Share Live Location
                </button>
                {shareLink && (
                  <div className="mt-2 p-2 bg-[#1a1f35] rounded border border-accentPurple text-xs flex flex-col gap-1">
                    <span className="text-green-400">Link copied to clipboard!</span>
                    <a href={shareLink} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline break-all hover:text-blue-200">
                      {shareLink}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Mock instructions/info */}
          <div className="mt-auto pt-6 border-t border-gray-800">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Try these coordinates</h3>
            <ul className="text-sm text-gray-500 space-y-2">
              <li><strong className="text-gray-300">Origin:</strong> -73.985,40.758 (Times Square)</li>
              <li><strong className="text-gray-300">Dest:</strong> -73.935,40.730 (Queens)</li>
            </ul>
          </div>
        </div>
        
        <div className="flex-grow h-[50vh] md:h-auto relative z-0">
          <MapView 
            routesData={routesData} 
            activeRouteMode={activeRouteMode} 
            liveReports={liveReports}
            isReportMode={isReportMode}
            onMapClick={handleMapClick}
            showHeatmap={showHeatmap}
            heatmapZones={heatmapZones}
          />
        </div>
      </main>
    </div>
  );
}

export default MainApp;
