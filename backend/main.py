import os
import uuid
import json
from typing import Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp
import asyncio
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

app = FastAPI(title="PodCuts AI Summarizer")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
    print("WARNING: GEMINI_API_KEY is not set or is still the default value.")

# Initialize Gemini Client
client = genai.Client(api_key=GEMINI_API_KEY)

class SummarizeRequest(BaseModel):
    url: str

class SummarizeResponse(BaseModel):
    summary: str
    transcript: str

class GeminiSchema(BaseModel):
    transcript: str
    summary: str

def download_audio(url: str, temp_dir: str = "temp") -> str:
    """Downloads audio from a given URL using yt-dlp."""
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
    
    file_id = str(uuid.uuid4())
    output_path = os.path.join(temp_dir, f"{file_id}.%(ext)s")
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_path,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
        }],
        'quiet': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            # Find the downloaded file
            expected_file = os.path.join(temp_dir, f"{file_id}.mp3")
            if os.path.exists(expected_file):
                 return expected_file
            
            # fallback
            for f in os.listdir(temp_dir):
                if f.startswith(file_id):
                    return os.path.join(temp_dir, f)
            raise Exception("Downloaded file not found.")
    except Exception as e:
        raise Exception(f"Failed to download audio: {e}")

async def process_with_gemini(audio_path: str) -> GeminiSchema:
    """Uploads the audio to Gemini and requests a transcript + summary in one pass."""
    audio_file = None
    try:
        # Note: We must use a thread to upload/generate since the SDK operations are synchronous
        print(f"Uploading {audio_path} to Gemini...")
        audio_file = await asyncio.to_thread(client.files.upload, file=audio_path)
        
        prompt = (
            "Listen to this audio. First, provide a complete, verbatim transcript of the audio. "
            "Then, provide a concise, structured summary of the content in bullet points. "
            "Maintain the chronological flow for the summary. "
            "Return the result exactly matching the JSON schema provided."
        )
        
        print("Generating content with gemini-2.5-flash...")
        response = await asyncio.to_thread(
            client.models.generate_content,
            model='gemini-2.5-flash',
            contents=[audio_file, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiSchema,
            )
        )
        
        # The response text will be a JSON string matching GeminiSchema
        result_json = json.loads(response.text)
        return GeminiSchema(**result_json)
        
    except Exception as e:
        raise Exception(f"Gemini processing failed: {e}")
    finally:
        # Ensure we delete the file from Gemini to save space/cost
        if audio_file:
            try:
                print(f"Cleaning up file {audio_file.name} from Gemini...")
                await asyncio.to_thread(client.files.delete, name=audio_file.name)
            except Exception as cleanup_error:
                print(f"Warning: Failed to clean up Gemini file: {cleanup_error}")

@app.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_endpoint(request: SummarizeRequest):
    try:
        # 1. Download Audio locally
        print(f"Downloading audio from {request.url}...")
        audio_file_path = await asyncio.to_thread(download_audio, request.url)
        
        # 2. Process with Gemini
        gemini_result = await process_with_gemini(audio_file_path)
        
        # 3. Clean up the local audio file
        if os.path.exists(audio_file_path):
            os.remove(audio_file_path)
            
        return SummarizeResponse(
            summary=gemini_result.summary,
            transcript=gemini_result.transcript
        )
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
