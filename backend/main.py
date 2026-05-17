from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
import httpx
import asyncio
from datetime import date, timedelta
import time

from fetch_feeds import main
from typing import List

from models import earthquakeEvent, wildfireEvent, flightEvent

from opensky_api import OpenSkyApi, TokenManager # type: ignore

app = FastAPI()


@app.get("/")
def home():
    return {"message": "Vision Dashboard API"}   


@app.get("/feeds")
async def get_feeds():
    
    feeds = await main()

    return feeds

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

        if feature["properties"]["mag"] >= 2.5:
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

