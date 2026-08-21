import json
import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib

def calculate_target(metrics):
    # This is our original heuristic. We use it to generate realistic labels
    # but we add some gaussian noise to simulate human variance.
    base_score = (
        0.30 * metrics['lighting_score'] +
        0.25 * metrics['crowd_density_score'] +
        0.20 * (100 - metrics['crime_incidence_score']) +
        0.15 * metrics['cctv_police_proximity_score'] +
        0.10 * metrics['live_community_report_score']
    )
    # Add random noise between -5 and +5
    noise = np.random.normal(0, 2.5) 
    final = base_score + noise
    return max(0, min(100, final))

def main():
    print("Loading seed data...")
    # Load the seeded safety data
    data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'src', 'data', 'seedSafetyData.json')
    
    with open(data_path, 'r') as f:
        zones = json.load(f)
        
    features = []
    targets = []
    
    # We will generate a larger synthetic dataset by sampling around our known zones
    # This gives the model enough data to learn generalization properly.
    print("Generating synthetic labeled dataset based on seed zones...")
    np.random.seed(42)
    
    for zone in zones:
        m = zone['metrics']
        # Create 50 synthetic data points per zone by jittering the metrics
        for _ in range(50):
            syn_m = {
                'lighting_score': max(0, min(100, m['lighting_score'] + np.random.normal(0, 10))),
                'crowd_density_score': max(0, min(100, m['crowd_density_score'] + np.random.normal(0, 10))),
                'crime_incidence_score': max(0, min(100, m['crime_incidence_score'] + np.random.normal(0, 5))),
                'cctv_police_proximity_score': max(0, min(100, m['cctv_police_proximity_score'] + np.random.normal(0, 5))),
                'live_community_report_score': max(0, min(100, m['live_community_report_score'] + np.random.normal(0, 10)))
            }
            features.append([
                syn_m['lighting_score'],
                syn_m['crowd_density_score'],
                syn_m['crime_incidence_score'],
                syn_m['cctv_police_proximity_score'],
                syn_m['live_community_report_score']
            ])
            targets.append(calculate_target(syn_m))
            
    # Also add some random totally random points
    for _ in range(500):
        syn_m = {
            'lighting_score': np.random.uniform(0, 100),
            'crowd_density_score': np.random.uniform(0, 100),
            'crime_incidence_score': np.random.uniform(0, 100),
            'cctv_police_proximity_score': np.random.uniform(0, 100),
            'live_community_report_score': np.random.uniform(0, 100)
        }
        features.append([
            syn_m['lighting_score'],
            syn_m['crowd_density_score'],
            syn_m['crime_incidence_score'],
            syn_m['cctv_police_proximity_score'],
            syn_m['live_community_report_score']
        ])
        targets.append(calculate_target(syn_m))
        
    X = np.array(features)
    y = np.array(targets)
    
    print(f"Total dataset size: {len(X)} records.")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training RandomForestRegressor...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    print("Evaluating model...")
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Mean Squared Error: {mse:.2f}")
    print(f"R^2 Score: {r2:.4f}")
    
    # Save the model
    model_path = os.path.join(os.path.dirname(__file__), 'safety_model.joblib')
    joblib.dump(model, model_path)
    print(f"Model saved successfully to {model_path}!")

if __name__ == '__main__':
    main()
