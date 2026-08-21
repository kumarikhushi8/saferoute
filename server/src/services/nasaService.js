const axios = require('axios');
const Jimp = require('jimp');

function getTileCoordinates(lat, lon, zoom) {
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  const y = Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
  return { x, y, z: zoom };
}

async function getNasaMacroLightingScore(lat, lon) {
  const zoom = 8;
  const { x, y, z } = getTileCoordinates(lat, lon, zoom);
  
  // Use a fixed clear night date to avoid cloud cover noise
  const date = '2023-01-01';
  const url = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_DayNightBand_ENCC/default/${date}/GoogleMapsCompatible_Level8/${z}/${y}/${x}.png`;
  
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const image = await Jimp.read(response.data);
    
    let totalBrightness = 0;
    let pixelCount = 0;
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (px, py, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      pixelCount++;
    });
    
    const avgBrightness = totalBrightness / pixelCount;
    
    // Map avgBrightness (0-255) to a score (0-100)
    // A brightness of 50 will give a score of 100.
    let macroScore = (avgBrightness / 50) * 100;
    if (macroScore > 100) macroScore = 100;
    
    console.log(`[NASA GIBS] Analyzed Tile ${z}/${y}/${x} - Avg Brightness: ${avgBrightness.toFixed(2)} - Score: ${macroScore.toFixed(0)}`);
    return Math.round(macroScore);
    
  } catch (err) {
    console.error("NASA GIBS fetch failed:", err.message);
    return 50; // Fallback
  }
}

module.exports = { getNasaMacroLightingScore };
