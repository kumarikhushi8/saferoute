const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const connectDB = require('./src/config/db');
const { calculateRouteSafetyScore } = require('./src/services/safetyScoreEngine');
const Report = require('./src/models/Report');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
app.use(express.json());

// Routes
app.post('/api/reports', async (req, res) => {
  try {
    const { lat, lng, reason } = req.body;
    if (!lat || !lng || !reason) {
      return res.status(400).json({ error: 'lat, lng, and reason are required' });
    }
    
    const report = new Report({
      location: { type: 'Point', coordinates: [lng, lat] },
      reason
    });
    await report.save();
    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).limit(100);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

app.get('/api/heatmap', (req, res) => {
  const seedDataPath = path.join(__dirname, 'src', 'data', 'seedSafetyData.json');
  try {
    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));
    // Filter zones with low lighting or high crime
    const riskyZones = seedData.filter(zone => 
      zone.metrics.lighting_score < 50 || zone.metrics.crime_incidence_score > 60
    );
    res.json(riskyZones);
  } catch(error) {
    console.error('Error loading heatmap:', error);
    res.status(500).json({ error: 'Failed to load heatmap data' });
  }
});

app.post('/api/sos', (req, res) => {
  const { lat, lng } = req.body;
  console.log('\n=============================================');
  console.log('🚨 SOS TRIGGERED! 🚨');
  console.log(`Sending emergency location [${lat}, ${lng}] to contacts...`);
  console.log('=============================================\n');
  res.json({ success: true, message: 'Emergency contacts notified.' });
});

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
      
      // Fetch recent reports to pass to the scoring engine
      const recentReports = await Report.find().limit(100);
      
      // Calculate safety score for each route
      const scoredRoutes = routes.map((r) => {
        const score = calculateRouteSafetyScore(r.geometry, recentReports);
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

