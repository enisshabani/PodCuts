import os
import re
import json
import asyncio
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
from dotenv import load_dotenv
from google import genai
from youtube_transcript_api import YouTubeTranscriptApi

load_dotenv()

app = FastAPI(title="PodCuts AI Summarizer V3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY or GEMINI_API_KEY == "    ":
    print("WARNING: GEMINI_API_KEY is not set or is still the default value.")

client = genai.Client(api_key=GEMINI_API_KEY)

class SummarizeRequest(BaseModel):
    url: str
    format: str = "Bullet Points"
    language: str = "English"
    custom_prompt: Optional[str] = None

class ChatRequest(BaseModel):
    transcript: str
    chat_history: List[Dict[str, str]]
    new_message: str

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
        fetched_transcript = YouTubeTranscriptApi.get_transcript(video_id)
        
        lines = []
        for snippet in fetched_transcript:
            time_str = format_timestamp(snippet['start'])
            clean_text = snippet['text'].replace('\n', ' ')
            lines.append(f"{time_str} {clean_text}")
            
        return " ".join(lines)
    except Exception as e:
        raise Exception(f"Could not fetch transcript for video: {e}")

async def process_with_gemini(transcript: str, output_format: str, language: str, custom_prompt: Optional[str] = None) -> str:
    try:
        prompt = (
            f"You are an expert summarizer and content creator. "
            f"Please summarize the following transcript according to these strict rules:\n\n"
            f"1. **Language**: Write the entire response fluently in {language}.\n"
            f"2. **Format**: Format your response exactly as: {output_format}.\n"
            f"3. **Timestamps**: The transcript has `[MM:SS]` timestamps injected into it. Whenever you mention a key point, quote, or transition, you MUST cite the relevant timestamp exactly as it appears in the text (e.g., `[04:20]`).\n"
            f"4. **Syntax**: Use standard Markdown formatting.\n\n"
        )
        
        if custom_prompt:
            prompt += f"5. **Custom Instructions**: {custom_prompt}\n\n"
            
        prompt += f"--- TRANSCRIPT ---\n{transcript}"
        
        response = await asyncio.to_thread(
            client.models.generate_content,
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text
    except Exception as e:
        raise Exception(f"Gemini processing failed: {e}")

@app.post("/api/summarize")
async def summarize_endpoint(request: SummarizeRequest):
    async def event_stream():
        try:
            video_id = get_video_id(request.url)
            yield f"data: {json.dumps({'status': 'fetching', 'message': f'Fetching transcript for video {video_id}...'})}\n\n"
            
            transcript = await asyncio.to_thread(fetch_transcript_text, video_id)
            
            yield f"data: {json.dumps({'status': 'generating', 'message': 'Analyzing and generating summary...'})}\n\n"
            summary = await process_with_gemini(transcript, request.format, request.language, request.custom_prompt)
            
            payload = {
                "status": "complete",
                "summary": summary,
                "transcript": transcript,
                "video_id": video_id
            }
            yield f"data: {json.dumps(payload)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in request.chat_history])
        prompt = f"""You are a helpful AI assistant answering questions about a video.
        
Context (Video Transcript):
{request.transcript}

Conversation History:
{history_text}

User's new question: {request.new_message}

Please provide a helpful, concise answer based ONLY on the provided transcript. If the answer is not in the transcript, say so.
"""
        response = await asyncio.to_thread(
            client.models.generate_content,
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return {"answer": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_audio(
    file: UploadFile = File(...),
    format: str = Form("Bullet Points"),
    language: str = Form("English"),
    custom_prompt: Optional[str] = Form(None)
):
    try:
        os.makedirs("temp", exist_ok=True)
        file_path = f"temp/{file.filename}"
        with open(file_path, "wb") as f:
            f.write(await file.read())
            
        async def event_stream():
            try:
                yield f"data: {json.dumps({'status': 'fetching', 'message': 'Uploading audio to Gemini...'})}\n\n"
                
                # Upload to Gemini
                uploaded_file = await asyncio.to_thread(client.files.upload, file=file_path)
                
                yield f"data: {json.dumps({'status': 'generating', 'message': 'Analyzing audio and generating summary...'})}\n\n"
                
                prompt = f"Summarize this audio. Language: {language}. Format: {format}."
                if custom_prompt:
                    prompt += f" Custom Instructions: {custom_prompt}"
                    
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model='gemini-2.5-flash',
                    contents=[uploaded_file, prompt]
                )
                
                payload = {
                    "status": "complete",
                    "summary": response.text,
                    "transcript": "Audio transcript not available inline.",
                    "video_id": "audio_upload"
                }
                yield f"data: {json.dumps(payload)}\n\n"
                
                # Cleanup
                os.remove(file_path)
                
            except Exception as e:
                yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
                
        return StreamingResponse(event_stream(), media_type="text/event-stream")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
