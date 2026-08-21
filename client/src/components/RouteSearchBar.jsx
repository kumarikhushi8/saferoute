import React, { useState } from 'react';

const RouteSearchBar = ({ onSearch, isLoading }) => {
  // We'll use lng,lat for this MVP (e.g. "-73.985,40.758" for Times Square)
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (origin && destination) {
      onSearch(origin, destination);
    }
  };

  return (
    <div className="bg-[#1a1f35] p-6 rounded-lg shadow-2xl border border-gray-800">
      <h2 className="text-xl font-bold mb-4 text-white">Find Safe Route</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Origin (lng,lat)</label>
          <input 
            type="text" 
            className="w-full bg-[#0f1424] border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-accentPurple transition-colors"
            placeholder="-73.985,40.758"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Destination (lng,lat)</label>
          <input 
            type="text" 
            className="w-full bg-[#0f1424] border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-accentPurple transition-colors"
            placeholder="-73.935,40.730"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
          />
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-accentPurple hover:bg-[#6b4deb] text-white font-bold py-2 px-4 rounded transition-colors mt-2 disabled:opacity-50"
        >
          {isLoading ? 'Calculating...' : 'Get Route'}
        </button>
      </form>
    </div>
  );
};

export default RouteSearchBar;
