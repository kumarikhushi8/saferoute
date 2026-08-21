# SafeRoute 🛡️

**AI-Powered Night-Time Safe Navigation Web Platform**

> "Because the fastest way home is not always the safest."

Built by **Team FusionX** (Kumari Khushi, Swati Pal) — CodeFusion 2026 · Problem Track: Smart Mobility & Public Safety

---

## 📌 The Problem

Mainstream map apps optimize for speed and distance — they never factor in street lighting, crowd presence, or crime history. At night, the shortest path often cuts through isolated lanes, unlit stretches, and low-footfall areas.

- **52% of urban Indian women** say they always or often feel unsafe walking alone at night *(YouGov India Safety Survey)*
- Women, students, and night-shift workers disproportionately face this gap every night
- The people most likely to need a safer route have the least help finding one

**SafeRoute closes this gap.**

## 💡 The Solution

SafeRoute is a safety-first navigation layer that ranks routes by **safety first, distance second** — the opposite of conventional map apps.

| Conventional Map Apps | SafeRoute |
|---|---|
| ❌ Shortest / fastest path only | ✅ Safest, well-lit path prioritized |
| ❌ Traffic-aware, safety-blind | ✅ Lighting + crowd + CCTV aware |
| ❌ Ranks purely by distance & ETA | ✅ Ranks by community-verified safety |
| ❌ No community safety input | ✅ Real-time reports keep data fresh |

## ✨ Enterprise-Grade Data Architecture

We didn't just mock data for a hackathon. Our backend is a genuine, scalable data powerhouse:

- 🛰️ **NASA GIBS Live Image Processing**: SafeRoute dynamically fetches NASA *Earth at Night* (VIIRS) satellite imagery tiles for any route and physically scans the pixels using Node.js to calculate macro neighborhood brightness.
- 🗺️ **Live OSM Geo-Caching**: We query the Overpass API in real-time to fetch `lit=no` (broken streetlights), `amenity=police` (CCTV proxy), and crowd-generating POIs (cafes, shops). Results are geo-cached in a `1km` grid for 0ms latency during navigation.
- ⏰ **Time-of-Day Crowd Heuristics**: Our engine calculates crowd density by cross-referencing OSM POI counts with the current time (e.g., a street full of closed shops at 3 AM is penalized as an isolated "ghost town").
- 📊 **Nearest-Neighbor Crime Index**: We built a curated historical NCRB proxy dataset of 145 Indian cities (5 per state). The engine uses the Haversine formula to detect the user's closest city and pulls its baseline crime risk.
- 🧠 **Generative AI Route Summaries**: Powered by OpenRouter and Google Gemini 2.0 Flash Lite, delivering natural-language route guidance explaining exactly *why* a route is safer.

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + Tailwind CSS + React-Leaflet |
| Backend | Node.js + Express + `jimp` (NASA Image Processing) |
| Database | MongoDB (User data + Live Community Hazards) |
| Routing | OSRM (Open Source Routing Machine) |
| Safety Engine | Node.js Multi-Layer Evaluator (NASA + OSM + NCRB + MongoDB) |
| AI | OpenRouter (Gemini 2.0 Flash Lite) |

## 📂 Project Structure

```
saferoute/
├── client/                  # React frontend
│   └── src/
│       ├── components/      # map, report, sos, search, layout
├── server/                  # Node/Express backend
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── services/        
│       │   ├── safetyScoreEngine.js  # The Multi-Layer Math Evaluator
│       │   ├── osmService.js         # Live Overpass Geo-Caching
│       │   ├── nasaService.js        # NASA Satellite Image Processing
│       │   ├── crimeDataService.js   # Nearest-Neighbor historical search
│       │   └── llmService.js         # OpenRouter Gemini Summaries
│       ├── models/
│       └── data/            # 145-city historicalCrimeData.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas connection string (or Local Mongo)
- OpenRouter API Key

### Installation

```bash
# Clone the repo
git clone https://github.com/<your-org>/saferoute.git
cd saferoute

# Install server dependencies
cd server
npm install
# Add OPENROUTER_API_KEY and MONGODB_URI to .env

# Install client dependencies
cd ../client
npm install
```

### Running Locally

```bash
# Terminal 1 — start backend
cd server
npm run dev

# Terminal 2 — start frontend
cd client
npm run start
```

App runs at `http://localhost:5173`, API at `http://localhost:5000`.

## 🗺️ Roadmap

| Phase | Goal | Deliverable |
|---|---|---|
| **Phase 1 (Done)** | Dynamic Safety-score engine on live planetary data | Working Demo |
| **Phase 2** | Pilot with a college campus / local ward | Validated Accuracy |
| **Phase 3** | Integrate municipal CCTV & smart-city feeds | City-Wide Rollout |

## 🌍 Why It Matters

SafeRoute is built for **women, students, and night-shift workers** who need to move after dark. It reduces the daily mental calculation of *"is taking this route worth the risk?"* — and becomes a living, community-built safety layer that gets smarter the more people use and contribute to it.

---

*SafeRoute turns navigation from fastest to safest — powered by AI, NASA, OpenStreetMap, and community intelligence.*
