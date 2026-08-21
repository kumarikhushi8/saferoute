# SafeRoute 🛡️

**AI-Powered Night-Time Safe Navigation Web Platform**

> "Because the fastest way home is not always the safest."

Built by **Team FusionX** — CodeFusion 2026 · Problem Track: Smart Mobility & Public Safety

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

## ✨ Key Features

- 🛡️ **AI Safety Score (0–100)** — every road segment scored using street lighting, crowd density, historical crime data, CCTV/police proximity, and live community reports
- 🔀 **Safety-Optimized Routing** — one-click toggle between Safest / Balanced / Fastest routes with transparent safety metrics
- 👥 **Community Reporting** — flag an unsafe stretch or broken streetlight in seconds; visible to nearby users instantly
- 🌙 **Night Risk Heatmap** — visualizes high-risk zones across the city after dark
- 🔔 **SOS with Live Location** — one-click alert shares live location with emergency contacts
- 📍 **Trusted Contact Sharing** — loved ones can track a journey in real time until it ends

## 🏗️ System Flow

```
User Request → Maps API → AI Safety Engine → Route Optimizer → Safe Route
```

1. **User Request** — user submits origin and destination
2. **Maps API** — fetches candidate paths and traffic data (Google Maps / OSM)
3. **AI Safety Engine** — scores every street segment for lighting, crowd, crime & hazard risk
4. **Route Optimizer** — re-ranks candidate paths by safety score and user preferences
5. **Safe Route** — delivers the safest viable path to the user's screen

### Safety Score Formula

```
safety_score = (
    0.30 × lighting_score +
    0.25 × crowd_density_score +
    0.20 × (100 - crime_incidence_score) +
    0.15 × cctv_police_proximity_score +
    0.10 × live_community_report_score
)
```

See [`docs/SAFETY_SCORE_FORMULA.md`](docs/SAFETY_SCORE_FORMULA.md) for full details.

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + Tailwind CSS + React-Leaflet |
| Backend | Node.js + Express |
| Database | MongoDB Atlas / Firebase Firestore |
| Routing | OSRM / OpenRouteService |
| Safety Engine | Weighted scoring engine (Node.js) |
| Deployment | Vercel (frontend) + Render/Railway (backend) |

## 📂 Project Structure

```
saferoute/
├── client/                  # React frontend
│   └── src/
│       ├── components/      # map, report, sos, search, layout
│       ├── pages/
│       ├── hooks/
│       ├── services/
│       └── context/
├── server/                  # Node/Express backend
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── services/        # safetyScoreEngine.js, routeOptimizer.js
│       ├── models/
│       ├── data/            # seedSafetyData.json
│       └── config/
├── docs/
│   ├── ARCHITECTURE.md
│   └── SAFETY_SCORE_FORMULA.md
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas connection string (or Firebase project)

### Installation

```bash
# Clone the repo
git clone https://github.com/<your-org>/saferoute.git
cd saferoute

# Install server dependencies
cd server
npm install
cp .env.example .env   # add your Mongo URI / API keys

# Install client dependencies
cd ../client
npm install
```

### Running Locally

```bash
# Terminal 1 — start backend
cd server
npm run dev

# Terminal 2 — seed mock safety data (first run only)
cd server
node seed.js

# Terminal 3 — start frontend
cd client
npm run dev
```

App runs at `http://localhost:5173`, API at `http://localhost:5000`.

## 🗺️ Roadmap

| Phase | Goal | Deliverable |
|---|---|---|
| **Phase 1** | MVP — Safety-score engine + safest-route mode on sample city data | Working Demo |
| **Phase 2** | Pilot with a college campus / local ward; validate scores against on-ground volunteer feedback | Validated Accuracy |
| **Phase 3** | Open crowd-sourced data network; integrate municipal CCTV & smart-city feeds | City-Wide Rollout |

### Future Scope
- 🏙️ Smart City Integration — plug into municipal lighting/CCTV/dispatch feeds
- ⌚ Wearable SOS Support — trigger alerts without unlocking the phone
- 📡 Offline Emergency Mode — SOS + last-synced heatmap without connectivity
- 📈 Predictive Risk Alerts — forecast emerging high-risk zones before incidents occur

## 🌍 Why It Matters

SafeRoute is built for **women, students, and night-shift workers** who need to move after dark. It reduces the daily mental calculation of *"is taking this route worth the risk?"* — and becomes a living, community-built safety layer that gets smarter the more people use and contribute to it.

## 👥 Team

**Team FusionX** — Kumari Khushi  ·Swati Pal 

---

*SafeRoute turns navigation from fastest to safest — powered by AI and community intelligence.*
