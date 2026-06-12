from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import httpx
import asyncio
from datetime import date, timedelta
import time
import trafilatura # type: ignore
import ollama

from fetch_feeds import main    
from videos_urls import VIDEOS_URLS
import feedparser # type: ignore

from typing import List

from models import earthquakeEvent, wildfireEvent, flightEvent, video

from opensky_api import OpenSkyApi, TokenManager # type: ignore

from youtube_transcript_api import YouTubeTranscriptApi # type: ignore

app = FastAPI()


@app.get("/")
def home():
    return {"message": "Vision Dashboard API"}   


@app.get("/feeds")
async def get_feeds():
    return StreamingResponse(
        main(),
        media_type="application/x-ndjson"
    )

@app.get("/earthquakes")
async def get_earthquakes():

    start = time.time()

    params = {
    "format": "geojson",
    "starttime": date.today() - timedelta(days=2),
    "endtime": date.today()
    }   

    earthquakes: List[earthquakeEvent] = []

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://earthquake.usgs.gov/fdsnws/event/1/query",
            params=params
        )

        data = response.json()

    for feature in data["features"]:

        if feature["properties"]["mag"] and feature["properties"]["mag"] >= 2.5:
            response_feed = earthquakeEvent(
                magnitude=feature["properties"]["mag"],
                place=feature["properties"]["place"],
                time=feature["properties"]["time"],
                felt=feature["properties"]["felt"],
                cdi=feature["properties"]["cdi"],
                coordinates=feature["geometry"]["coordinates"]
            )
        
            earthquakes.append(response_feed)

    print(f"Time taken for Earthquake: {time.time() - start} seconds")

    return earthquakes


@app.get("/wildfires")
async def get_wildfires():
    start = time.time()

    params = {
        "limit": 300,
        "status": "open",  
        "source": "GDACS",
        "category": "wildfires"
    }

    wildfires: List[wildfireEvent] = []

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://eonet.gsfc.nasa.gov/api/v3/events",
            params=params
        )

        data = response.json()

        for event in data["events"]:
            response_feed = wildfireEvent(
                title=event["title"],
                description=event["description"],
                source=event["sources"][0]["id"],
                magnitudeValue=event["geometry"][0]["magnitudeValue"],
                magnitudeUnit=event["geometry"][0]["magnitudeUnit"],
                date=event["geometry"][0]["date"],
                coordinates=event["geometry"][0]["coordinates"]
            )

            wildfires.append(response_feed)

    print(f"Time taken for Wildfires: {time.time() - start} seconds")

    return wildfires


@app.get("/flights")
async def get_flights():

    start = time.time()

    tm = TokenManager.from_json_file("credentials.json")
    api = OpenSkyApi(token_manager=tm)

    # opensky_api uses a blocking `requests` session, so push it off the
    # event loop to keep FastAPI responsive while the API call is in flight.
    states = await asyncio.to_thread(
        api.get_states,
        bbox=(6.0, 37.0, 68.0, 97.0),
    )

    flights: List[flightEvent] = []

    if states and states.states:
        for flight in states.states:
            if flight.latitude is None or flight.longitude is None:
                continue

            callsign = flight.callsign.strip() if flight.callsign else None

            response_feed = flightEvent(
                callsign=callsign or None,
                geo_altitude=flight.geo_altitude,
                latitude=flight.latitude,
                longitude=flight.longitude,
                on_ground=bool(flight.on_ground),
                origin_country=flight.origin_country,
                time_position=flight.time_position,
                true_track=flight.true_track,
                velocity=flight.velocity,
                vertical_rate=flight.vertical_rate,
            )

            flights.append(response_feed)

    print(f"Time taken for Flights: {time.time() - start} seconds")

    return flights

@app.post("/summarize")
async def summarize(request: Request):

    data = await request.json()

    url = data.get("url", "")

    downloaded = trafilatura.fetch_url(url)
    text = trafilatura.extract(downloaded)

    response = ollama.chat(
        model="granite4.1:8b",
        messages=[
            {
                'role': 'system',
                'content': 'You are a news summarization assistant; you will be given cleaned article text extracted using Trafilatura and your task is to summarize it like a professional news reporter delivering a brief news bulletin—clear, factual, and neutral; use only the provided text and do not add, assume, or infer any information; if details are missing, state they are not specified in the article; present the output in a concise news style with a short headline followed by a tight, reporter-style summary of key facts (who, what, when, where, why, how), focusing on the most important developments, outcomes, and figures; keep the tone objective, formal, and broadcast-ready, avoiding opinions, repetition, and any external knowledge.'
            },
            {
                'role': 'user',
                'content': f"Summarize the following news:\n\n{text}"
            }
        ]
    )

    return response['message']['content']

@app.post("/videos", response_model=List[video])
async def get_videos():

    videos = []

    for feed in VIDEOS_URLS:
        response = feedparser.parse(feed["url"])

        for entry in response.entries:
            videos.append(
                video(
                    id=entry.get("yt_videoid"),
                    link=entry.get("link"),
                    title=entry.get("title"),
                    published=entry.get("published"),
                    summary=entry.get("summary"),
                    source=feed["source"]
                )
            )

    videos.sort(key=lambda x: x.published, reverse=True)

    return videos

@app.post("/videos/summarize")
async def summarize_video(request: Request):

    data = await request.json()

    video_id = data.get("id", "")

    if not video_id:
        return "No transcript found"

    ytt_api = YouTubeTranscriptApi()

    try:
        fetched_transcript = await asyncio.to_thread(ytt_api.fetch, video_id)
    except Exception:
        return "No transcript found"

    if not fetched_transcript or len(fetched_transcript) == 0:
        return "No transcript found"

    text = " ".join(snippet.text for snippet in fetched_transcript).strip()

    if not text:
        return "No transcript found"

    response = ollama.chat(
        model="granite4.1:8b",
        messages=[
            {
                'role': 'system',
                'content': 'You are a news summarization assistant; you will be given cleaned article text extracted using Trafilatura and your task is to summarize it like a professional news reporter delivering a brief news bulletin—clear, factual, and neutral; use only the provided text and do not add, assume, or infer any information; if details are missing, state they are not specified in the article; present the output in a concise news style with a short headline followed by a tight, reporter-style summary of key facts (who, what, when, where, why, how), focusing on the most important developments, outcomes, and figures; keep the tone objective, formal, and broadcast-ready, avoiding opinions, repetition, and any external knowledge.'
            },
            {
                'role': 'user',

                'content': f"Summarize the following news:\n\n{text}"
            }
        ]
    )

    return response['message']['content']