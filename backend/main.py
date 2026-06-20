from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import asyncio
from typing import List
from youtube_transcript_api import YouTubeTranscriptApi # type: ignore

import trafilatura # type: ignore
from langchain_groq import ChatGroq # type: ignore
from langchain_core.messages import SystemMessage, HumanMessage

from controllers.fetch_news import fetch_news    
from controllers.fetch_videos import fetch_videos
from controllers.fetch_earthquake import fetch_earthquake

from models import video

from ai.chat import chat


app = FastAPI()

llm = ChatGroq(model="meta-llama/llama-4-scout-17b-16e-instruct")

@app.get("/")
def home():
    return {"message": "Vision Dashboard API"}   

@app.get("/feeds")
async def get_feeds():
    return StreamingResponse(
        fetch_news(llm=llm),
        media_type="application/x-ndjson"
    )

@app.get("/earthquakes")
async def get_earthquakes():
    result = await fetch_earthquake()
    return result

@app.post("/summarize")
async def summarize(request: Request):

    data = await request.json()

    url = data.get("url", "")

    downloaded = trafilatura.fetch_url(url)
    text = trafilatura.extract(downloaded)

    if not text:
        return {"error": "Could not extract article text from URL"}

    response = await llm.ainvoke([
        SystemMessage(
            content=(
                'You are a news summarization assistant; you will be given cleaned article text extracted using Trafilatura and your task is to summarize it like a professional news reporter delivering a brief news bulletin—clear, factual, and neutral; use only the provided text and do not add, assume, or infer any information; if details are missing, state they are not specified in the article; present the output in a concise news style with a short headline followed by a tight, reporter-style summary of key facts (who, what, when, where, why, how), focusing on the most important developments, outcomes, and figures; keep the tone objective, formal, and broadcast-ready, avoiding opinions, repetition, and any external knowledge.'
            )
        ),
        HumanMessage(
            content=f"Summarize the following news:\n\n{text}"
        )
    ])

    return response.content

@app.get("/videos", response_model=List[video])
async def get_videos():
    result = await fetch_videos()
    return result

@app.post("/videos/summarize")
async def summarize_video(request: Request):
    data = await request.json()

    video_id = data.get("id", "")

    if not video_id:
       return {"error": "No video ID provided"}

    ytt_api = YouTubeTranscriptApi()

    try:
        fetched_transcript = await asyncio.to_thread(
            ytt_api.fetch,
            video_id
        )
    except Exception:
        return {"error": "No transcript found"}

    if not fetched_transcript:
        return {"error": "No transcript found"}

    text = " ".join(
        snippet.text for snippet in fetched_transcript
    ).strip()

    if not text:
        return {"error": "No transcript found"}

    response = await llm.ainvoke([
        SystemMessage(
            content=(
                'You are a news summarization assistant; you will be given cleaned article text extracted using Trafilatura and your task is to summarize it like a professional news reporter delivering a brief news bulletin—clear, factual, and neutral; use only the provided text and do not add, assume, or infer any information; if details are missing, state they are not specified in the article; present the output in a concise news style with a short headline followed by a tight, reporter-style summary of key facts (who, what, when, where, why, how), focusing on the most important developments, outcomes, and figures; keep the tone objective, formal, and broadcast-ready, avoiding opinions, repetition, and any external knowledge.'
            )
        ),
        HumanMessage(
            content=f"Summarize the following transcript:\n\n{text}"
        )
    ])

    return response.content

@app.post("/chat")
async def chat_api(request: Request):
    data = await request.json()

    input_query = data.get("input_query", "")

    if not input_query:
        return {"error": "No input query provided"}

    return StreamingResponse(
        chat(input_query),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )