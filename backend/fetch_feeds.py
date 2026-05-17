import asyncio
import feedparser # type: ignore
import time
from rss_urls import RSS_URLS
import httpx
from models import Feeds, feed
from datetime import date, datetime, timedelta
import spacy
from countries import Countries

nlp = spacy.load("en_core_web_sm")  

all_feeds = []

async def fetch_feeds(rss_urls, client):

    local_feeds = []

    print(f"Fetching feeds for {rss_urls['category']}")

    source = rss_urls["source"]
    url = rss_urls["url"]

    response = await client.get(url)
    parsed_feed = feedparser.parse(response.text)

    for entry in parsed_feed.entries:

        if not entry.get("published_parsed"):
            continue

        published_date = datetime(*entry.published_parsed[:6]).date()

        if published_date == date.today() or published_date == date.today() - timedelta(days=2):
            continue

        doc = nlp(entry.get("title", ""))

        found_countries = []

        lat = None
        lon = None

        for ent in doc.ents:
            if ent.label_ == "GPE":

                country_name = ent.text

                if country_name in Countries:

                    found_countries.append(country_name)

                    lat = Countries[country_name]["latitude"]
                    lon = Countries[country_name]["longitude"]

        response_feed = feed(
            source=source,
            title=entry.get("title", ""),
            summary=entry.get("summary", ""),
            link=entry.get("link", ""),
            published=entry.get("published", ""),
            category=rss_urls["category"],
            country=found_countries,
            latitude=lat,
            longitude=lon
        )

        local_feeds.append(response_feed)

    return local_feeds


async def main():
    
    start = time.time()

    global all_feeds

    all_feeds = []    

    tasks = []

    
    async with httpx.AsyncClient() as client:
        for rss_urls in RSS_URLS:
            task = asyncio.create_task(fetch_feeds(rss_urls, client))
            tasks.append(task)

        results =await asyncio.gather(*tasks)

        for result in results:
            all_feeds.extend(result)

    final_feeds = Feeds(feeds=all_feeds)

    print(f"Time taken for Feeds: {time.time() - start} seconds")

    return final_feeds