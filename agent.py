from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline

# --- 1. Basic Flask App Setup ---
app = Flask(__name__)
CORS(app) # Allows the Chrome extension to talk to this server

# --- 2. Load the AI Model (The Brains) ---
# This line downloads and loads a pre-trained model from Hugging Face.
# The download (a few GBs) only happens the first time you run this.
# We load it here so it's ready and waiting for requests, not loaded every time.
# ...existing code...
print("Loading the AI model, this might take a moment...")
classifier = pipeline(
    "zero-shot-classification",
    model="facebook/bart-large-mnli",
    device=-1  # set to 0 if you have a CUDA GPU
)
print("AI Model loaded successfully. Server is ready!")

# --- 3. Create the API Endpoint ---
@app.route('/filter', methods=['POST'])
def filter_videos():
    # Get the list of video titles sent by the Chrome extension
    data = request.get_json()
    if not data or 'titles' not in data:
        return jsonify({'error': 'Invalid input'}), 400

    titles = data['titles']
    if not titles:
        return jsonify({'decisions': []})

    # Use short clear labels
    candidate_labels = ['educational', 'distracting']
    confidence_threshold = 0.6  # only hide when model is reasonably confident
    
    # Use the AI model to classify all titles in one go (it's efficient!)
    results = classifier(titles, candidate_labels, truncation=True)

    # --- 4. Process the Results ---
    decisions = []
    for result in results:
        top_label = result['labels'][0]
        top_score = result['scores'][0]
        
        # If model says "distracting" with enough confidence -> hide, otherwise show
        if top_label == 'distracting' and top_score >= confidence_threshold:
            decisions.append('hide')
        else:
            decisions.append('show')
            
    return jsonify({'decisions': decisions})


# --- 5. Run the Server ---
if __name__ == '__main__':
    # This starts the server on your local machine
    app.run(port=5000, debug=True)