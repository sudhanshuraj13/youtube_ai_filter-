# youtube_ai_filter-

Intelligent Browser Extension for distraction-free YouTube viewing using Hybrid Filtering (Keywords + Zero-Shot AI).

Table of Contents

🌟 Key Features

🧠 AI Model and Zero-Shot Classification

💻 Architecture Overview

🚀 Getting Started

Prerequisites

Setup Instructions

🛠️ Technology Stack

License

🌟 Key Features

The YouTube AI Focus Agent employs a dual-layered approach to curation, ensuring highly relevant and low-latency filtering.

Hybrid Content Filtering: Utilizes a fast, user-managed Keyword Filter for immediate removal of obvious content (e.g., "prank," "tutorial"), and an advanced AI Filter for semantic classification of ambiguous titles.

Zero-Shot AI Core: The powerful AI backend can classify content as 'educational' or 'distracting' without needing to be retrained on YouTube-specific data.

Dynamic Filtering: The content.js script actively scans and filters new videos loaded via infinite scroll or navigation, providing a seamless and consistently clean feed.

Intuitive Controls: The popupUI.html provides a user-friendly interface to toggle the entire extension, manage custom Hide and Show keyword lists, and control the filtering logic.

Local Backend: The AI model runs locally on a Flask server, ensuring your data remains private and filtering decisions are made quickly.

🧠 AI Model and Zero-Shot Classification

The core intelligence of this project is the Zero-Shot Classification (ZSC) model, which serves as the AI Filter.

The Model: facebook/bart-large-mnli

The AI agent (agent.py) uses a pre-trained BART (Bidirectional Encoder Representations from Transformers) model, specifically one fine-tuned for the Multi-Genre Natural Language Inference (MNLI) task. This model is exceptionally good at understanding the semantic relationship between a piece of text (the YouTube title) and a set of custom labels.

Zero-Shot Classification Explained

Instead of training a model specifically on thousands of "distracting" and "educational" YouTube titles, ZSC allows the model to classify text based on its general language understanding.

The Workflow:

The browser extension sends a list of unknown YouTube titles to the /filter API endpoint.

The AI agent instructs the model to classify each title against the following custom labels: ['educational', 'distracting'].

The model returns a confidence score for each label (e.g., educational: 0.15, distracting: 0.85).

Decision Logic: If the top label is 'distracting' and the confidence score is 0.6 or higher, the model recommends to hide the video. Otherwise, it defaults to show.

Hybrid Filtering Process

Browser Scan: content.js finds new video titles.

Keyword Check: The title is first checked against the user-defined showKeywords and hideKeywords. If a match is found, the video is filtered immediately.

AI Check: If no keyword match is found, the title is sent to the local Python AI Agent for Zero-Shot Classification.

Final Action: Based on the AI's classification ('hide' or 'show'), the video element is either removed from the user's view (display: none) or left visible.

💻 Architecture Overview

The project follows a Client-Server architecture where the browser extension is the client and the Python script hosts the AI server.

Component	Technology	Role
Client	JavaScript, HTML, CSS	The Chrome Extension (Manages UI, settings via chrome.storage.sync, and page manipulation on YouTube via content.js).
Server/Agent	Python, Flask	Hosts the Zero-Shot Classification model, provides the /filter API endpoint, and performs the heavy-lifting AI inference.
Communication	fetch API (POST request)	Used by content.js to send titles to the local Flask server (http://127.0.0.1:5000/filter).

🚀 Getting Started

Follow these steps to set up and run the AI Agent and install the browser extension locally.

Prerequisites

Python (3.7+)

pip (Python package installer)

Setup Instructions
Step 1: Clone the Repository
code
Bash
download
content_copy
expand_less
git clone https://github.com/sudhanshuraj13/youtube_ai_filter-.git
cd youtube_ai_filter-
Step 2: Set up the AI Python Agent

Create a virtual environment (recommended):

code
Bash
download
content_copy
expand_less
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

Install Dependencies:
You must install the necessary libraries for the AI model and the Flask server.

pip install flask flask-cors transformers

Run the AI Agent:
The agent.py script needs to be running in the background to serve the model. The first time you run this, it will download the multi-gigabyte BART model from Hugging Face.

python agent.py

The console will show: AI Model loaded successfully. Server is ready!

Step 3: Install the Browser Extension

Open your browser (e.g., Google Chrome) and navigate to chrome://extensions.

Enable Developer mode using the toggle switch (usually in the upper right corner).

Click the Load unpacked button.

Navigate to and select the root directory of your cloned repository (youtube_ai_filter-).

The "YouTube AI Focus Agent" extension icon should now appear in your browser's toolbar. Ensure the Python agent is running before navigating to YouTube.

🛠️ Technology Stack

AI Backend (Server):

Python

Flask (Web Framework for the API)

Hugging Face transformers (Model loading and inference)

facebook/bart-large-mnli (Zero-Shot Classification Model)

Client (Browser Extension):

JavaScript (content.js, popupLogic.js)

HTML/CSS (popupUI.html)

Chrome Extension APIs (chrome.storage.sync, chrome.tabs.sendMessage)

License

This project is open-source. 