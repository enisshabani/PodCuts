import os
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from dotenv import load_dotenv
from google import genai
from youtube_transcript_api import YouTubeTranscriptApi

load_dotenv()

app = FastAPI(title="PodCuts AI Summarizer V2")

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

client = genai.Client(api_key=GEMINI_API_KEY)

class SummarizeRequest(BaseModel):
    url: str
    format: str = "Bullet Points"
    language: str = "English"

class SummarizeResponse(BaseModel):
    summary: str
    transcript: str
    video_id: str

def get_video_id(url: str) -> str:
    match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
    if not match:
        raise ValueError("Invalid YouTube URL. Please provide a standard YouTube video link.")
    return match.group(1)

def format_timestamp(seconds: float) -> str:
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"[{m:02d}:{s:02d}]"

def fetch_transcript_text(video_id: str) -> str:
    try:
        api = YouTubeTranscriptApi()
        fetched_transcript = api.fetch(video_id)
        
        # Inject timestamps into the text every few seconds so Gemini has context
        lines = []
        for snippet in fetched_transcript.snippets:
            time_str = format_timestamp(snippet.start)
            clean_text = snippet.text.replace('\n', ' ')
            lines.append(f"{time_str} {clean_text}")
            
        return " ".join(lines)
    except Exception as e:
        raise Exception(f"Could not fetch transcript for video: {e}")

async def process_with_gemini(transcript: str, output_format: str, language: str) -> str:
    """Summarizes the transcript using Gemini with custom constraints."""
    try:
        prompt = (
            f"You are an expert summarizer and content creator. "
            f"Please summarize the following video transcript according to these strict rules:\n\n"
            f"1. **Language**: Write the entire response fluently in {language}.\n"
            f"2. **Format**: Format your response exactly as: {output_format}.\n"
            f"3. **Timestamps**: The transcript has `[MM:SS]` timestamps injected into it. Whenever you mention a key point, quote, or transition, you MUST cite the relevant timestamp exactly as it appears in the text (e.g., `[04:20]`).\n"
            f"4. **Syntax**: Use standard Markdown formatting.\n\n"
            f"--- TRANSCRIPT ---\n"
            f"{transcript}"
        )
        
        response = await asyncio.to_thread(
            client.models.generate_content,
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        return response.text
        
    except Exception as e:
        raise Exception(f"Gemini processing failed: {e}")

@app.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_endpoint(request: SummarizeRequest):
    try:
        video_id = get_video_id(request.url)
        print(f"Fetching subtitles for video {video_id}...")
        
        transcript = await asyncio.to_thread(fetch_transcript_text, video_id)
        
        print(f"Summarizing transcript via Gemini (Format: {request.format}, Lang: {request.language})...")
        summary = await process_with_gemini(transcript, request.format, request.language)
        
        return SummarizeResponse(
            summary=summary,
            transcript=transcript,
            video_id=video_id
        )
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
