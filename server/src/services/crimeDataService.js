const fs = require('fs');
const path = require('path');

const crimeDataPath = path.join(__dirname, '../data/historicalCrimeData.json');
let historicalData = [];

try {
  historicalData = JSON.parse(fs.readFileSync(crimeDataPath, 'utf8'));
} catch (e) {
  console.error("Failed to load historical crime data:", e.message);
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Haversine distance in km
function getDistanceFromLatLonInKm(lon1, lat1, lon2, lat2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; 
  return d;
}

/**
 * Finds the nearest city to the given coordinates and returns its historical crime index.
 * If no city is within 100km, returns a default national average (e.g. 50).
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @returns {number} Crime index (0-100)
 */
function getBaselineCrimeScore(lng, lat) {
  if (!historicalData || historicalData.length === 0) return 50;

  let nearestCity = null;
  let minDistance = Infinity;

  for (const record of historicalData) {
    const dist = getDistanceFromLatLonInKm(lng, lat, record.coordinates[0], record.coordinates[1]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestCity = record;
    }
  }

  // If the route is in the wilderness (> 100km from any major city), default to 50
  if (minDistance > 100) {
    return 50;
  }

  return nearestCity.historical_crime_index;
}

module.exports = {
  getBaselineCrimeScore
};
