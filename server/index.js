const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const connectDB = require('./src/config/db');
const { calculateRouteSafetyScore } = require('./src/services/safetyScoreEngine');
const { classifyReport, generateRouteSummary, draftSOSMessage } = require('./src/services/llmService');
const Report = require('./src/models/Report');
const User = require('./src/models/User');

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
    
    // LLM Moderation & Classification
    const llmAnalysis = await classifyReport(reason);
    if (llmAnalysis.isSpam) {
      return res.status(400).json({ error: 'Report flagged as spam.' });
    }
    
    const report = new Report({
      location: { type: 'Point', coordinates: [lng, lat] },
      reason,
      category: llmAnalysis.category,
      urgency: llmAnalysis.urgency
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

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const user = new User({ name, email, password }); // Plaintext for demo MVP
    await user.save();
    
    res.status(201).json({ id: user._id, name: user.name, email: user.email, emergencyContacts: user.emergencyContacts });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    res.json({ id: user._id, name: user.name, email: user.email, emergencyContacts: user.emergencyContacts });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/user/:id/contacts', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.emergencyContacts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

app.post('/api/user/:id/contacts', async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.emergencyContacts.push({ name, phone });
    await user.save();
    res.json(user.emergencyContacts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add contact' });
  }
});

app.post('/api/sos', async (req, res) => {
  const { lat, lng, userId } = req.body;
  console.log('\n=============================================');
  console.log('🚨 SOS TRIGGERED! 🚨');
  
  if (userId) {
    try {
      const user = await User.findById(userId);
      if (user && user.emergencyContacts.length > 0) {
        console.log(`Alerting ${user.name}'s Emergency Contacts:`);
        
        // Use LLM to draft the exact context-aware message
        const sosDraft = await draftSOSMessage(user, lat, lng);
        
        user.emergencyContacts.forEach(contact => {
          console.log(` -> 📱 SMS to ${contact.name} (${contact.phone}): "${sosDraft}"`);
        });
      } else {
        console.log(`No emergency contacts found for user ${userId}. Broadcasting to authorities...`);
      }
    } catch (e) {
      console.log('Error fetching user for SOS:', e.message);
    }
  } else {
    console.log(`Sending generic emergency location [${lat}, ${lng}] to emergency services...`);
  }
  
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
      
      // Calculate Bounding Box for OSM Fetching
      const [lng1, lat1] = origin.split(',').map(Number);
      const [lng2, lat2] = destination.split(',').map(Number);
      const minLat = Math.min(lat1, lat2);
      const maxLat = Math.max(lat1, lat2);
      const minLng = Math.min(lng1, lng2);
      const maxLng = Math.max(lng1, lng2);
      
      const { getDynamicOSMData } = require('./src/services/osmService');
      const osmZones = await getDynamicOSMData(minLat, minLng, maxLat, maxLng);
      
      // Fetch recent reports to pass to the scoring engine
      const recentReports = await Report.find().limit(100);
      
      // Calculate safety score for each route using the ML Microservice
      const scoredRoutes = await Promise.all(routes.map(async (r) => {
        const score = await calculateRouteSafetyScore(r.geometry, recentReports, osmZones);
        return {
          geometry: r.geometry,
          duration: r.duration,
          distance: r.distance,
          score: score
        };
      }));

      // Sort by duration ascending to find fastest
      const fastest = [...scoredRoutes].sort((a, b) => a.duration - b.duration)[0];
      
      // Sort by score descending to find safest
      const safest = [...scoredRoutes].sort((a, b) => b.score - a.score)[0];
      
      // Generate AI Summaries for both routes
      const routesAreIdentical = fastest.duration === safest.duration && fastest.score === safest.score;
      fastest.summary = await generateRouteSummary(Math.round(fastest.duration / 60), Math.round(fastest.distance / 1000), fastest.score, true, routesAreIdentical);
      safest.summary = await generateRouteSummary(Math.round(safest.duration / 60), Math.round(safest.distance / 1000), safest.score, false, routesAreIdentical);

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

