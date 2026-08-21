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
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'saferoute-super-secret';

// Rate Limiters
const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { error: 'Too many reports created from this IP, please try again after 10 minutes' }
});

const sosLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2,
  message: { error: 'SOS rate limit exceeded. Please try again after 15 minutes' }
});

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token.' });
    req.user = user;
    next();
  });
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/api/reports', reportLimiter, async (req, res) => {
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

app.get('/api/heatmap', async (req, res) => {
  const { minLat, minLng, maxLat, maxLng } = req.query;

  if (minLat && minLng && maxLat && maxLng) {
    try {
      const { getDynamicOSMData } = require('./src/services/osmService');
      
      // Prevent massive queries that would timeout Overpass API
      const latDiff = Math.abs(parseFloat(maxLat) - parseFloat(minLat));
      const lngDiff = Math.abs(parseFloat(maxLng) - parseFloat(minLng));
      if (latDiff > 2.0 || lngDiff > 2.0) {
         return res.status(400).json({ error: 'Area too large for live heatmap. Please zoom in.' });
      }

      let zones = [];
      const result = await getDynamicOSMData(parseFloat(minLat), parseFloat(minLng), parseFloat(maxLat), parseFloat(maxLng));
      zones = result.zones || [];
      
      // Removed hardcoded seed data merge to prevent Delhi points from showing globally
      // Dynamic fallback is handled in osmService.js if the area lacks OSM data
      
      // Filter out only the risky zones (e.g., unlit roads or high crime)
      const riskyZones = zones.filter(zone => 
        (zone.id && zone.id.includes('risk-zone')) || 
        (zone.metrics && zone.metrics.lighting_score < 50) || 
        (zone.metrics && zone.metrics.crime_incidence_score > 60)
      );
      
      res.json(riskyZones);
    } catch (error) {
      console.error('Error generating dynamic heatmap:', error);
      res.status(500).json({ error: 'Failed to generate dynamic heatmap' });
    }
  } else {
    // If no bounds provided, return an empty array rather than falling back to static seed data
    res.json([]);
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, emergencyContacts: user.emergencyContacts } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, emergencyContacts: user.emergencyContacts } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/user/:id/contacts', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.emergencyContacts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

app.post('/api/user/:id/contacts', authenticateToken, async (req, res) => {
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

// Apply stricter limiter to prevent Twilio SMS spam charges
app.post('/api/sos', sosLimiter, async (req, res) => {
  const { lat, lng, userId, trackingUrl } = req.body;
  console.log('\n=============================================');
  console.log('🚨 SOS TRIGGERED! 🚨');
  
  if (userId) {
    try {
      const user = await User.findById(userId);
      if (user && user.emergencyContacts.length > 0) {
        console.log(`Alerting ${user.name}'s Emergency Contacts:`);
        
        // Use LLM to draft the exact context-aware message
        const sosDraft = await draftSOSMessage(user, lat, lng, trackingUrl);
        
        user.emergencyContacts.forEach(async (contact) => {
          console.log(` -> 📱 SMS to ${contact.name} (${contact.phone}): "${sosDraft}"`);
          
          // Send real SMS via Twilio if configured
          if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
            try {
              const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
              await twilioClient.messages.create({
                body: sosDraft,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: contact.phone
              });
              console.log(`    ✅ Successfully dispatched SMS to ${contact.phone}`);
            } catch (twilioErr) {
              console.error(`    ❌ Failed to send Twilio SMS to ${contact.phone}:`, twilioErr.message);
            }
          } else {
            console.log(`    ⚠️ Twilio not configured in .env. Skipping real SMS dispatch.`);
          }
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

app.get('/api/admin/evaluate-point', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng are required' });
    }

    const { getDynamicOSMData } = require('./src/services/osmService');
    const { getNasaMacroLightingScore } = require('./src/services/nasaService');
    const { getBaselineCrimeScore } = require('./src/services/crimeDataService');

    // 1. Get Baseline Crime
    const baselineCrime = getBaselineCrimeScore(lng, lat);

    // 2. Get NASA Lighting
    const nasaLightingScore = await getNasaMacroLightingScore(lat, lng);

    // 3. Get OSM Data (we pad a tiny bounding box around the point)
    const padding = 0.005; 
    const minLat = lat - padding;
    const maxLat = lat + padding;
    const minLng = lng - padding;
    const maxLng = lng + padding;
    
    const { zones: osmZones, metadata: osmMetadata } = await getDynamicOSMData(minLat, minLng, maxLat, maxLng);

    // Calculate crowd density heuristic based on POIs
    const hour = new Date().getHours();
    let crowdScore = 50;
    if (osmMetadata && osmMetadata.poiCount) {
      const poiDensity = Math.min(osmMetadata.poiCount, 100);
      if (hour >= 6 && hour <= 19) {
        crowdScore = 50 + (poiDensity * 0.5); // Day
      } else {
        crowdScore = 50 - (poiDensity * 0.3); // Night
      }
    }

    // Default metrics before applying specific zones
    let rawMetrics = {
      lighting_score: nasaLightingScore,
      crowd_density_score: Math.max(0, Math.min(100, crowdScore)),
      crime_incidence_score: baselineCrime,
      cctv_police_proximity_score: 50,
      poiCount: osmMetadata ? osmMetadata.poiCount : 0
    };

    // If point is inside a highly specific zone (police or unlit road), blend it
    // For simplicity of the admin dashboard, we just return the raw unweighted base data + OSM counts
    let nearestZone = null;
    let minDistance = Infinity;

    // Haversine distance function inline for admin view
    function deg2rad(deg) { return deg * (Math.PI/180); }
    function getDist(coord1, coord2) {
      const R = 6371;
      const dLat = deg2rad(coord2[1] - coord1[1]);
      const dLon = deg2rad(coord2[0] - coord1[0]); 
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(coord1[1])) * Math.cos(deg2rad(coord2[1])) * Math.sin(dLon/2) * Math.sin(dLon/2); 
      return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
    }

    if (osmZones && osmZones.length > 0) {
      for (const zone of osmZones) {
         const dist = getDist([lng, lat], zone.coordinates);
         if (dist < minDistance) {
           minDistance = dist;
           nearestZone = zone;
         }
      }
      
      if (nearestZone && minDistance <= nearestZone.radiusKm) {
        rawMetrics.cctv_police_proximity_score = nearestZone.metrics.cctv_police_proximity_score;
        if (nearestZone.id.includes('risk-zone-unlit')) {
            rawMetrics.lighting_score = Math.min(rawMetrics.lighting_score, 15);
        }
      }
    }

    res.json(rawMetrics);

  } catch (error) {
    console.error('Error in admin evaluation:', error.message);
    res.status(500).json({ error: 'Failed to evaluate point' });
  }
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
      const { zones: osmZones, metadata: osmMetadata } = await getDynamicOSMData(minLat, minLng, maxLat, maxLng);
      
      const { getNasaMacroLightingScore } = require('./src/services/nasaService');
      const nasaLightingScore = await getNasaMacroLightingScore(minLat, minLng);
      
      // Fetch recent reports to pass to the scoring engine
      const recentReports = await Report.find().limit(100);
      
      // Calculate safety score for each route using the ML Microservice
      const scoredRoutes = await Promise.all(routes.map(async (r) => {
        const score = await calculateRouteSafetyScore(r.geometry, recentReports, osmZones, osmMetadata, nasaLightingScore);
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

      // Filter out only the risky zones for the heatmap overlay
      const riskyZones = (osmZones || []).filter(zone => 
        (zone.id && zone.id.includes('risk-zone')) || 
        (zone.metrics && zone.metrics.lighting_score < 50) || 
        (zone.metrics && zone.metrics.crime_incidence_score > 60)
      );

      return res.json({ fastest, safest, heatmapZones: riskyZones });
    } else {
      return res.status(404).json({ error: 'No route found' });
    }
  } catch (error) {
    let errorMsg = 'Failed to fetch route';
    if (error.response && error.response.data && error.response.data.message) {
      errorMsg = error.response.data.message;
    } else if (error.response && error.response.status === 400) {
      errorMsg = 'Route not possible or distance too great.';
    }
    console.error('Error fetching route from OSRM:', errorMsg);
    return res.status(500).json({ error: errorMsg, details: error.message });
  }
});

// ==========================================
// PRODUCTION STATIC SERVING
// ==========================================
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// ==========================================
// WEBSOCKET: LIVE TRACKING
// ==========================================
const activeSessions = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  // Sender starts a tracking session
  socket.on('start_tracking', (data) => {
    const { trackingId, route } = data;
    if (!trackingId) return;

    console.log(`[Socket] Session started: ${trackingId}`);
    activeSessions.set(trackingId, { route, currentPosition: null });
    socket.join(trackingId);
  });

  // Receiver joins a tracking session
  socket.on('join_tracking', (trackingId) => {
    if (!trackingId) return;
    
    console.log(`[Socket] User joined tracking session: ${trackingId}`);
    socket.join(trackingId);

    // Send existing route data to the new receiver
    if (activeSessions.has(trackingId)) {
      const session = activeSessions.get(trackingId);
      socket.emit('route_data', session.route);
      if (session.currentPosition) {
        socket.emit('location_update', session.currentPosition);
      }
    } else {
      socket.emit('tracking_error', 'Live tracking session not found or expired.');
    }
  });

  // Sender updates their live location
  socket.on('location_update', (data) => {
    const { trackingId, position, index } = data;
    if (!trackingId) return;

    if (activeSessions.has(trackingId)) {
      const session = activeSessions.get(trackingId);
      session.currentPosition = { position, index };
    }

    // Broadcast to receivers in this room
    socket.to(trackingId).emit('location_update', { position, index });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
  });
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});


// Trigger nodemon restart
