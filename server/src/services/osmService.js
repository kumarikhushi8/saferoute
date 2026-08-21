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
  
  // 3. Construct Overpass Query (Police & Unlit Roads & POIs)
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="police"](${bbox});
      way["highway"]["lit"="no"](${bbox});
      node["amenity"~"cafe|restaurant|marketplace"](${bbox});
      node["shop"](${bbox});
    );
    out center 300;
  `;
  
  try {
    const response = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, { 
      headers: HEADERS,
      timeout: 3500 // Fail fast (3.5s) instead of hanging the entire backend if OSM is slow
    });
    const elements = response.data.elements || [];
    
    const zones = [];
    let policeCount = 0;
    let unlitCount = 0;
    let poiCount = 0;

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
      } else if (el.tags && (el.tags.shop || el.tags.amenity)) {
        // It's a crowd-generating POI
        poiCount++;
      }
    }
    
    console.log(`[OSM Live Fetch] complete: ${policeCount} police stations, ${unlitCount} unlit segments, ${poiCount} POIs.`);
    
    // Hackathon Demo Fallback: If OSM has very sparse lighting data for this area, generate procedural risk zones
    if (unlitCount < 3) {
      console.log(`[OSM] Only ${unlitCount} unlit roads found. Injecting procedural risk zones for demonstration.`);
      for (let i = 0; i < 4; i++) {
        const randLat = minLat + Math.random() * (maxLat - minLat);
        const randLng = minLng + Math.random() * (maxLng - minLng);
        zones.push({
          id: `risk-zone-procedural-${Math.random()}`,
          name: 'Unlit/Deserted Area (Demo)',
          coordinates: [randLng, randLat],
          radiusKm: 0.6 + (Math.random() * 0.5),
          metrics: {
            lighting_score: 20 + Math.random() * 10,
            crowd_density_score: 10 + Math.random() * 20,
            crime_incidence_score: 60 + Math.random() * 20,
            cctv_police_proximity_score: 20,
            live_community_report_score: 40
          }
        });
      }
    }
    
    const result = { zones, metadata: { poiCount } };
    
    // Save to cache
    cache[gridKey] = result;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
    
    return result;
    
  } catch (error) {
    console.log(`[OSM API Timeout/Error] ${error.message}. Injecting procedural risk zones instantly.`);
    
    // If Overpass is throttling or down, do NOT return an empty map after a long delay!
    // Instantly generate and return procedural risk zones so the UX remains flawless.
    const zones = [];
    for (let i = 0; i < 4; i++) {
      const randLat = minLat + Math.random() * (maxLat - minLat);
      const randLng = minLng + Math.random() * (maxLng - minLng);
      zones.push({
        id: `risk-zone-procedural-${Math.random()}`,
        name: 'Unlit/Deserted Area (Demo)',
        coordinates: [randLng, randLat],
        radiusKm: 0.6 + (Math.random() * 0.5),
        metrics: {
          lighting_score: 20 + Math.random() * 10,
          crowd_density_score: 10 + Math.random() * 20,
          crime_incidence_score: 60 + Math.random() * 20,
          cctv_police_proximity_score: 20,
          live_community_report_score: 40
        }
      });
    }
    
    // Do NOT cache error fallbacks so it can try fetching real data again later
    return { zones, metadata: { poiCount: 0 } };
  }
}

module.exports = { getDynamicOSMData };
