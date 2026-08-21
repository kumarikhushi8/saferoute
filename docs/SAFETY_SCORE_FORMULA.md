# Safety Score Formula

The safety score engine evaluates the safety of a road segment on a scale of 0 to 100, where 100 is the safest. The calculation is performed using a weighted sum of various environmental and historical safety metrics.

## Formula

```
safety_score = (
    0.30 × lighting_score +
    0.25 × crowd_density_score +
    0.20 × (100 - crime_incidence_score) +
    0.15 × cctv_police_proximity_score +
    0.10 × live_community_report_score
)
```

## Metrics Breakdown

Each input metric is normalized to a 0–100 scale:

1. **`lighting_score` (30%)**: Represents the quality of street lighting. 100 = brightly lit, 0 = no lighting.
2. **`crowd_density_score` (25%)**: "Eyes on the street". Represents pedestrian traffic and active storefronts. 100 = busy area, 0 = deserted.
3. **`crime_incidence_score` (20%)**: Historical crime data. 100 = high crime rate, 0 = no reported crimes. Note that in the formula, this is inverted `(100 - score)` because lower crime incidence translates to higher safety.
4. **`cctv_police_proximity_score` (15%)**: Presence of security cameras, emergency phones, or proximity to a police station. 100 = high presence.
5. **`live_community_report_score` (10%)**: Real-time reports from the community (e.g., "feels unsafe", "suspicious activity"). 100 = mostly positive reports or no negative reports, 0 = highly active negative reports.
