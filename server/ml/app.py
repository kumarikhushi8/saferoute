from flask import Flask, request, jsonify
import joblib
import numpy as np
import os
import cv2
import hashlib
import glob
try:
    from ultralytics import YOLO
except ImportError:
    pass # Will be handled by missing dependencies check

app = Flask(__name__)

# Load YOLO Model
try:
    yolo_model = YOLO('yolov8n.pt')
    print("Successfully loaded YOLOv8n model.")
except Exception as e:
    print(f"Warning: Could not load YOLO model. {e}")
    yolo_model = None

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

@app.route('/analyze_street', methods=['POST'])
def analyze_street():
    data = request.json
    lat = data.get('lat')
    lng = data.get('lng')
    
    if not lat or not lng:
        return jsonify({"error": "Missing lat/lng"}), 400
        
    mock_images = glob.glob(os.path.join(os.path.dirname(__file__), 'mock_images', '*.jpg'))
    if not mock_images:
        return jsonify({"error": "No mock images found"}), 500
        
    # Use coordinate hash to consistently pick the same image for the same spot
    hash_idx = int(hashlib.md5(f"{round(lat,3)},{round(lng,3)}".encode()).hexdigest(), 16) % len(mock_images)
    img_path = mock_images[hash_idx]
    
    # 1. Brightness Analysis with OpenCV
    img = cv2.imread(img_path)
    if img is None:
        return jsonify({"error": "Failed to load image"}), 500
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    avg_brightness = np.mean(gray)
    lighting_score = min(100, max(0, (avg_brightness / 255.0) * 100))
    
    # 2. Crowd/Car Density with YOLOv8
    density_score = 50
    person_count = 0
    car_count = 0
    
    if yolo_model:
        results = yolo_model(img, verbose=False)
        boxes = results[0].boxes
        for box in boxes:
            cls_id = int(box.cls[0])
            if cls_id == 0: # person
                person_count += 1
            elif cls_id == 2: # car
                car_count += 1
        density_score = min(100, (person_count * 5) + (car_count * 2))
    
    return jsonify({
        "lighting_score": round(lighting_score, 2),
        "crowd_density_score": round(density_score, 2),
        "cv_metrics": {
            "avg_pixel_brightness": round(avg_brightness, 2),
            "persons_detected": person_count,
            "cars_detected": car_count,
            "image_used": os.path.basename(img_path)
        }
    })

if __name__ == '__main__':
    print("Starting ML Safety Scoring Microservice on port 5001...")
    # Run in production-like single threaded mode for the demo, or dev server
    app.run(host='0.0.0.0', port=5001, debug=False)
