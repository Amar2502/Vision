import time
from datetime import date, timedelta
from typing import List
import httpx
from models import earthquakeEvent

async def fetch_earthquake():

    start = time.time()

    params = {
    "format": "geojson",
    "starttime": date.today() - timedelta(days=1),
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