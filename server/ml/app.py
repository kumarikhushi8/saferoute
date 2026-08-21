from flask import Flask, request, jsonify
import joblib
import numpy as np
import os

app = Flask(__name__)

# Load the trained model into memory once when the microservice starts
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'safety_model.joblib')
model = None

try:
    model = joblib.load(MODEL_PATH)
    print(f"Successfully loaded model from {MODEL_PATH}")
except Exception as e:
    print(f"Warning: Could not load model. {e}")

@app.route('/predict', methods=['POST'])
def predict():
    if not model:
        return jsonify({"error": "Model not loaded"}), 500
        
    data = request.json
    if not data or not isinstance(data, list):
        return jsonify({"error": "Expected a JSON array of metric objects"}), 400
        
    # Extract features for all requested points
    features = []
    for m in data:
        features.append([
            m.get('lighting_score', 50),
            m.get('crowd_density_score', 50),
            m.get('crime_incidence_score', 50),
            m.get('cctv_police_proximity_score', 50),
            m.get('live_community_report_score', 50)
        ])
        
    X = np.array(features)
    
    # Batch predict
    predictions = model.predict(X)
    
    # Return array of predicted scores
    return jsonify({"scores": predictions.tolist()})

if __name__ == '__main__':
    print("Starting ML Safety Scoring Microservice on port 5001...")
    # Run in production-like single threaded mode for the demo, or dev server
    app.run(host='0.0.0.0', port=5001, debug=False)
