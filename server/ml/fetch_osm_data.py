import requests
import json
import os
import random

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
HEADERS = {'User-Agent': 'SafeRoute Hackathon Project / 1.0'}

# Bounding box for Delhi (Central / South Delhi area)
# min_lat, min_lon, max_lat, max_lon
BBOX = "28.50,77.10,28.75,77.30"

def get_police_stations():
    query = f"""
    [out:json][timeout:90];
    node["amenity"="police"]({BBOX});
    out 50;
    """
    response = requests.post(OVERPASS_URL, data={'data': query}, headers=HEADERS)
    return response.json().get('elements', [])

def get_unlit_roads():
    query = f"""
    [out:json][timeout:90];
    way["highway"]["lit"="no"]({BBOX});
    out center 50;
    """
    response = requests.post(OVERPASS_URL, data={'data': query}, headers=HEADERS)
    return response.json().get('elements', [])

def generate_seed_data():
    zones = []
    
    print("Fetching real police stations in Delhi from OpenStreetMap...")
    try:
        police_stations = get_police_stations()
        for i, p in enumerate(police_stations):
            zones.append({
                "id": f"safe-zone-police-{i}",
                "name": p.get('tags', {}).get('name', 'Police Station Zone'),
                "coordinates": [p['lon'], p['lat']], # lng, lat
                "radiusKm": 1.5,
                "metrics": {
                  "lighting_score": random.randint(80, 95),
                  "crowd_density_score": random.randint(60, 80), # Higher proxy crowd
                  "crime_incidence_score": random.randint(10, 30),
                  "cctv_police_proximity_score": 100, # Max score for police
                  "live_community_report_score": random.randint(80, 95)
                }
            })
        print(f" -> Found {len(police_stations)} police stations.")
    except Exception as e:
        print("Failed to fetch police stations:", e)

    print("Fetching unlit roads in Delhi from OpenStreetMap...")
    try:
        unlit_roads = get_unlit_roads()
        for i, r in enumerate(unlit_roads):
            if 'center' not in r: continue
            zones.append({
                "id": f"risk-zone-unlit-{i}",
                "name": r.get('tags', {}).get('name', 'Unlit Road Segment'),
                "coordinates": [r['center']['lon'], r['center']['lat']],
                "radiusKm": 0.8,
                "metrics": {
                  "lighting_score": random.randint(10, 30), # Very poor lighting
                  "crowd_density_score": random.randint(10, 40), # Low foot traffic proxy
                  "crime_incidence_score": random.randint(60, 90), # Higher theoretical risk
                  "cctv_police_proximity_score": random.randint(10, 30),
                  "live_community_report_score": random.randint(20, 50)
                }
            })
        print(f" -> Found {len(unlit_roads)} unlit road segments.")
    except Exception as e:
        print("Failed to fetch unlit roads:", e)
        
    if not zones:
        print("Error: No zones could be fetched. Are you offline or is the API rate limited?")
        return

    output_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../src/data/seedSafetyData.json'))
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(zones, f, indent=2)
        
    print(f"Successfully generated {len(zones)} zones in Delhi from OSM data!")
    print(f"Saved to {output_path}")

if __name__ == '__main__':
    generate_seed_data()
