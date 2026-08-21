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

/**
 * Calculates the final safety score based on the formula.
 * @param {Object} metrics 
 * @returns {number} Final score 0-100
 */
function calculateScoreFromMetrics(metrics) {
  return (
    0.30 * metrics.lighting_score +
    0.25 * metrics.crowd_density_score +
    0.20 * (100 - metrics.crime_incidence_score) +
    0.15 * metrics.cctv_police_proximity_score +
    0.10 * metrics.live_community_report_score
  );
}

// Default baseline metrics for areas outside our mock zones
const DEFAULT_METRICS = {
  lighting_score: 50,
  crowd_density_score: 50,
  crime_incidence_score: 50,
  cctv_police_proximity_score: 50,
  live_community_report_score: 50
};

/**
 * Evaluates the safety score for an entire route.
 * @param {Object} routeGeoJSON - GeoJSON LineString geometry of the route
 * @returns {number} Aggregate safety score 0-100
 */
function calculateRouteSafetyScore(routeGeoJSON) {
  if (!routeGeoJSON || !routeGeoJSON.coordinates || routeGeoJSON.coordinates.length === 0) {
    return 50; // default fallback
  }

  const coords = routeGeoJSON.coordinates;
  let totalScore = 0;
  let pointCount = 0;

  // To optimize, evaluate every 5th point if route is long, but for MVP evaluate all points.
  // OSRM provides dense coordinates for curves, so sampling every 3rd point is reasonable.
  const step = Math.max(1, Math.floor(coords.length / 50)); 

  for (let i = 0; i < coords.length; i += step) {
    const pt = coords[i];
    
    // Find nearest mock zone
    let nearestZone = null;
    let minDistance = Infinity;

    for (const zone of seedData) {
      const dist = getDistanceFromLatLonInKm(pt, zone.coordinates);
      if (dist < minDistance) {
        minDistance = dist;
        nearestZone = zone;
      }
    }

    let metricsToUse = DEFAULT_METRICS;
    // If we are within the zone's radius, use its metrics
    if (nearestZone && minDistance <= nearestZone.radiusKm) {
      metricsToUse = nearestZone.metrics;
    }

    totalScore += calculateScoreFromMetrics(metricsToUse);
    pointCount++;
  }

  if (pointCount === 0) return 50;
  
  const averageScore = totalScore / pointCount;
  // Round to nearest integer
  return Math.round(averageScore);
}

module.exports = {
  calculateRouteSafetyScore
};
