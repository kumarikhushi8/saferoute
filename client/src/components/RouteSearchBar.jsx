import React from 'react';

const RouteSearchBar = ({ onSearch, isLoading, origin, destination, mapSelectionMode, setMapSelectionMode }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (origin && destination) {
      onSearch();
    }
  };

  const handleSetOrigin = () => {
    setMapSelectionMode(mapSelectionMode === 'origin' ? null : 'origin');
  };

  const handleSetDestination = () => {
    setMapSelectionMode(mapSelectionMode === 'destination' ? null : 'destination');
  };

  return (
    <div className="bg-[#1a1f35] p-6 rounded-lg shadow-2xl border border-gray-800">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {/* Origin Field */}
        <div>
          <label className="block text-sm text-gray-400 mb-1 font-bold">Origin</label>
          <div className="flex gap-2">
            <div className={`flex-1 bg-[#0f1424] border ${mapSelectionMode === 'origin' ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'border-gray-700'} rounded p-2 text-white flex items-center transition-all`}>
              <span className="text-xs font-mono text-gray-300 truncate">
                {origin || "Not set"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSetOrigin}
              className={`px-3 py-2 rounded font-bold text-xs transition-colors ${mapSelectionMode === 'origin' ? 'bg-green-600 text-white animate-pulse' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
            >
              {mapSelectionMode === 'origin' ? '📍 Click Map' : 'Set on Map'}
            </button>
          </div>
        </div>

        {/* Destination Field */}
        <div>
          <label className="block text-sm text-gray-400 mb-1 font-bold">Destination</label>
          <div className="flex gap-2">
            <div className={`flex-1 bg-[#0f1424] border ${mapSelectionMode === 'destination' ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-gray-700'} rounded p-2 text-white flex items-center transition-all`}>
              <span className="text-xs font-mono text-gray-300 truncate">
                {destination || "Not set"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSetDestination}
              className={`px-3 py-2 rounded font-bold text-xs transition-colors ${mapSelectionMode === 'destination' ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
            >
              {mapSelectionMode === 'destination' ? '📍 Click Map' : 'Set on Map'}
            </button>
          </div>
        </div>

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
