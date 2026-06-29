# PodCuts

PodCuts is a lightning-fast, full-stack AI web application that instantly extracts closed captions from YouTube videos and uses Google's multimodal **Gemini 2.5 Flash** model to generate structured, chronological summaries in seconds.

No video downloading required!

## Features
- **Instant Subtitle Extraction**: Bypasses heavy video downloading by directly scraping YouTube closed captions via `youtube-transcript-api`.
- **Gemini Powered**: Leverages Google's Gemini 2.5 Flash model for lightning-fast, intelligent summarization.
- **Split-Screen UI**: A premium, glassmorphism-styled React frontend that displays the raw transcript side-by-side with the AI summary for easy cross-referencing.
- **Copy to Clipboard**: One-click copying of the generated summary.

## Architecture
- **Frontend**: React + Vite (Vanilla CSS with Glassmorphism aesthetic)
- **Backend**: Python + FastAPI
- **AI/LLM**: Google GenAI SDK (`gemini-2.5-flash`)

---

## Getting Started (Local Development)

Because this app uses the Gemini API, you will need to supply your own API key to run it locally. 

### 1. Prerequisites
- Node.js installed
- Python 3.10+ installed
- A free Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 2. Backend Setup
Navigate into the `backend` directory, create a virtual environment, and install the dependencies:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn pydantic python-dotenv google-genai youtube-transcript-api
```

**Environment Variables:**
Create a `.env` file inside the `backend` directory based on the example:
```bash
cp .env.example .env
```
Open the `.env` file and paste your Gemini API key:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

**Start the Server:**
```bash
uvicorn main:app --reload
```
*The FastAPI backend will now be running on `http://localhost:8000`.*

### 3. Frontend Setup
Open a new terminal window, navigate to the `frontend` directory, and install the dependencies:
```bash
cd frontend
npm install
```

**Start the React App:**
```bash
npm run dev
```
*The Vite frontend will typically run on `http://localhost:5173`.*

---

## Usage
1. Open your browser to the local Vite URL.
2. Paste any YouTube video link (ensure the video has closed captions enabled).
3. Hit **Summarize** and watch the AI generate the transcript and key takeaways instantly!
