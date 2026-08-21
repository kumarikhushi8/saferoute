const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../data/osm_cache.json');

// Ensure cache file exists
if (!fs.existsSync(CACHE_FILE)) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify({}), 'utf8');
}

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const HEADERS = { 'User-Agent': 'SafeRoute Hackathon Project / 1.0' };

async function getDynamicOSMData(minLat, minLng, maxLat, maxLng) {
  // 1. Round to 2 decimal places to create a ~1km grid cache key
  const gridKey = `${minLat.toFixed(2)},${minLng.toFixed(2)},${maxLat.toFixed(2)},${maxLng.toFixed(2)}`;
  
  // 2. Check Cache
  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  if (cache[gridKey]) {
    console.log(`[OSM Cache Hit] Returning cached data for grid: ${gridKey}`);
    return cache[gridKey];
  }

  console.log(`[OSM Cache Miss] Fetching live data for grid: ${gridKey}`);
  
  // We add some padding (e.g. 0.02) to make sure we get everything around the route
  const padding = 0.02;
  const bbox = `${minLat - padding},${minLng - padding},${maxLat + padding},${maxLng + padding}`;
  
  // 3. Construct Overpass Query (Police & Unlit Roads)
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="police"](${bbox});
      way["highway"]["lit"="no"](${bbox});
    );
    out center 150;
  `;
  
  try {
    const response = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, { headers: HEADERS });
    const elements = response.data.elements || [];
    
    // Process elements into zones exactly like seedSafetyData
    const zones = [];
    let policeCount = 0;
    let unlitCount = 0;

    for (const el of elements) {
      if (el.tags && el.tags.amenity === 'police') {
        zones.push({
            id: `safe-zone-police-${el.id}`,
            name: el.tags.name || 'Police Station Zone',
            coordinates: [el.lon, el.lat], // lng, lat
            radiusKm: 1.5,
            metrics: {
              lighting_score: 90,
              crowd_density_score: 70,
              crime_incidence_score: 20,
              cctv_police_proximity_score: 100, // Max for police
              live_community_report_score: 90
            }
        });
        policeCount++;
      } else if (el.tags && el.tags.lit === 'no') {
        const center = el.center || { lat: el.lat, lon: el.lon };
        if (center.lat && center.lon) {
           zones.push({
              id: `risk-zone-unlit-${el.id}`,
              name: el.tags.name || 'Unlit Road Segment',
              coordinates: [center.lon, center.lat], // lng, lat
              radiusKm: 0.8,
              metrics: {
                lighting_score: 15, // Terrible lighting
                crowd_density_score: 25,
                crime_incidence_score: 75,
                cctv_police_proximity_score: 20,
                live_community_report_score: 35
              }
           });
           unlitCount++;
        }
      }
    }
    
    console.log(`[OSM Live Fetch] complete: ${policeCount} police stations, ${unlitCount} unlit segments.`);
    
    // Save to cache
    cache[gridKey] = zones;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
    
    return zones;
    
  } catch (error) {
    console.error("Overpass API failed:", error.message);
    // Return empty array so the app doesn't crash on failure
    return [];
  }
}

module.exports = { getDynamicOSMData };
