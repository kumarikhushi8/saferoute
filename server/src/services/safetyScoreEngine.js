const fs = require('fs');
const path = require('path');

// Load mock data
const seedDataPath = path.join(__dirname, '../data/seedSafetyData.json');
const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

/**
 * Calculates the Haversine distance between two coordinates in kilometers.
 * @param {Array} coord1 - [longitude, latitude]
 * @param {Array} coord2 - [longitude, latitude]
 * @returns {number} distance in kilometers
 */
function getDistanceFromLatLonInKm(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

const axios = require('axios');

// Note: calculateScoreFromMetrics is no longer needed because
// we're using the Python ML Microservice for predictions!

// Default baseline metrics for areas outside our mock zones
const DEFAULT_METRICS = {
  lighting_score: 50,
  crowd_density_score: 50,
  crime_incidence_score: 50,
  cctv_police_proximity_score: 50,
  live_community_report_score: 50
};

/**
 * Evaluates the safety score for an entire route using the ML Microservice.
 * @param {Object} routeGeoJSON - GeoJSON LineString geometry of the route
 * @param {Array} recentReports - Array of live report documents from the database
 * @returns {Promise<number>} Aggregate safety score 0-100
 */
async function calculateRouteSafetyScore(routeGeoJSON, recentReports = []) {
  if (!routeGeoJSON || !routeGeoJSON.coordinates || routeGeoJSON.coordinates.length === 0) {
    return 50; // default fallback
  }

  const coords = routeGeoJSON.coordinates;
  const step = Math.max(1, Math.floor(coords.length / 50)); 
  
  const batchMetrics = [];
  
  // 1. Collect all metrics along the route
  for (let i = 0; i < coords.length; i += step) {
    const pt = coords[i];
    let nearestZone = null;
    let minDistance = Infinity;

    for (const zone of seedData) {
      const dist = getDistanceFromLatLonInKm(pt, zone.coordinates);
      if (dist < minDistance) {
        minDistance = dist;
        nearestZone = zone;
      }
    }

    let metricsToUse = { ...DEFAULT_METRICS };
    if (nearestZone && minDistance <= nearestZone.radiusKm) {
      metricsToUse = { ...nearestZone.metrics };
    }
    
    batchMetrics.push(metricsToUse);
  }

  if (batchMetrics.length === 0) return 50;

  // 2. Fetch predictions from Python ML microservice in one batch!
  let averageScore = 50;
  try {
    const response = await axios.post('http://localhost:5001/predict', batchMetrics);
    const scores = response.data.scores; // Array of scores
    
    const totalScore = scores.reduce((sum, val) => sum + val, 0);
    averageScore = totalScore / scores.length;
    
  } catch (error) {
    console.error('ML Microservice is offline. Falling back to default score (50). Make sure to run `python ml/app.py`!');
  }

  // 3. Apply live community report penalty
  let reportsPassed = new Set();
  for (const report of recentReports) {
    if (report.location && report.location.coordinates) {
      for (let i = 0; i < coords.length; i += step) {
        const pt = coords[i];
        const dist = getDistanceFromLatLonInKm(pt, report.location.coordinates);
        if (dist <= 0.5) { // Within 500m
          reportsPassed.add(report._id.toString());
          break; // Route passes this report
        }
      }
    }
  }

  averageScore -= (reportsPassed.size * 5);
  averageScore = Math.max(0, Math.min(100, averageScore));

  return Math.round(averageScore);
}

module.exports = {
  calculateRouteSafetyScore
};
