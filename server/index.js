const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');
const { calculateRouteSafetyScore } = require('./src/services/safetyScoreEngine');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Placeholder MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saferoute_placeholder';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected (placeholder)'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.post('/api/route', async (req, res) => {
  let { origin, destination } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'Origin and destination are required' });
  }

  origin = origin.trim();
  destination = destination.trim();

  try {
    // Format: lng,lat
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${origin};${destination}?overview=full&geometries=geojson&alternatives=3`;
    
    const response = await axios.get(osrmUrl);
    
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const routes = response.data.routes;
      
      // Calculate safety score for each route
      const scoredRoutes = routes.map((r) => {
        const score = calculateRouteSafetyScore(r.geometry);
        return {
          geometry: r.geometry,
          duration: r.duration,
          distance: r.distance,
          score: score
        };
      });

      // Sort by duration ascending to find fastest
      const fastest = [...scoredRoutes].sort((a, b) => a.duration - b.duration)[0];
      
      // Sort by score descending to find safest
      const safest = [...scoredRoutes].sort((a, b) => b.score - a.score)[0];

      return res.json({ fastest, safest });
    } else {
      return res.status(404).json({ error: 'No route found' });
    }
  } catch (error) {
    console.error('Error fetching route from OSRM:', error.message);
    return res.status(500).json({ error: 'Failed to fetch route', details: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
