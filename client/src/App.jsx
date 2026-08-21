import React, { useState } from 'react';
import axios from 'axios';
import MapView from './components/MapView';
import RouteSearchBar from './components/RouteSearchBar';

function App() {
  const [routesData, setRoutesData] = useState(null);
  const [activeRouteMode, setActiveRouteMode] = useState('safest'); // 'safest' or 'fastest'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (origin, destination) => {
    setIsLoading(true);
    setError('');
    setRoutesData(null);
    
    try {
      const response = await axios.post('http://localhost:5000/api/route', {
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
          <MapView routesData={routesData} activeRouteMode={activeRouteMode} />
        </div>
      </main>
    </div>
  );
}

export default App;
