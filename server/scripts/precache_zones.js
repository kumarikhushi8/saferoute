const { getDynamicOSMData } = require('../src/services/osmService');
const { getNasaMacroLightingScore } = require('../src/services/nasaService');

const zones = [
  {
    name: 'IIT Delhi (Public Campus)',
    bbox: { minLat: 28.535, minLng: 77.185, maxLat: 28.555, maxLng: 77.205 }
  },
  {
    name: 'Amity University, Noida (Private College)',
    bbox: { minLat: 28.540, minLng: 77.330, maxLat: 28.550, maxLng: 77.340 }
  },
  {
    name: 'Okhla Industrial Area Phase 1 (Industrial)',
    bbox: { minLat: 28.520, minLng: 77.270, maxLat: 28.540, maxLng: 77.290 }
  },
  {
    name: 'Sanjay Van (Forested/Isolated)',
    bbox: { minLat: 28.525, minLng: 77.165, maxLat: 28.540, maxLng: 77.180 }
  }
];

async function precache() {
  console.log('Starting Pre-cache for Pilot Zones...\n');

  for (const zone of zones) {
    console.log(`=========================================`);
    console.log(`Caching Zone: ${zone.name}`);
    const { minLat, minLng, maxLat, maxLng } = zone.bbox;

    // 1. Cache OSM Data
    console.log(`-> Fetching live OSM data...`);
    try {
      await getDynamicOSMData(minLat, minLng, maxLat, maxLng);
      console.log(`   [OK] OSM Cache populated.`);
    } catch (err) {
      console.error(`   [ERROR] OSM Fetch failed:`, err.message);
    }

    // 2. Cache NASA Lighting Data
    // We will sample a few points in the bounding box to ensure NASA tiles are fetched.
    console.log(`-> Fetching NASA GIBS Lighting Data...`);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    try {
      await getNasaMacroLightingScore(centerLat, centerLng);
      console.log(`   [OK] NASA Cache populated for center point.`);
    } catch (err) {
      console.error(`   [ERROR] NASA Fetch failed:`, err.message);
    }

    console.log(`=========================================\n`);
  }

  console.log('Pre-caching Complete!');
}

precache();
