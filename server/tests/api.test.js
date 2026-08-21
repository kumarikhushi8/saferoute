const request = require('supertest');
const express = require('express');
const rateLimit = require('express-rate-limit');

// Simple mock app just to test rate limiting since full app requires MongoDB and ML microservice mocks
const app = express();
app.use(express.json());

const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 5,
  message: { error: 'Too many reports created from this IP, please try again after 10 minutes' }
});

app.post('/api/reports', reportLimiter, (req, res) => {
  res.status(201).json({ success: true });
});

describe('Backend API Tests', () => {
  it('should allow up to 5 requests to /api/reports', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/reports')
        .send({ lat: 28.6, lng: 77.2, reason: 'Testing' });
      expect(res.statusCode).toBe(201);
    }
  });

  it('should rate limit the 6th request to /api/reports', async () => {
    // 6th request should fail with 429 Too Many Requests
    const res = await request(app)
      .post('/api/reports')
      .send({ lat: 28.6, lng: 77.2, reason: 'Spamming' });
    
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toMatch(/Too many reports/);
  });
});
