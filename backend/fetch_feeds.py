import asyncio
import feedparser # type: ignore
import time
from news_urls import NEWS_URLS
import httpx
from models import Feeds, feed
from datetime import date, datetime, timedelta
import spacy
from countries import Countries

nlp = spacy.load("en_core_web_sm")  

all_feeds = []

all_titles = set()

async def fetch_feeds(news_urls, client):

    local_feeds = []

    print(f"Fetching feeds for {news_urls['category']}")

    source = news_urls["source"]
    url = news_urls["url"]

    response = await client.get(url)
    parsed_feed = feedparser.parse(response.text)

    for entry in parsed_feed.entries:

        title = entry.get("title", "")

        if title in all_titles:
            continue

        all_titles.add(title)

        if not entry.get("published_parsed"):
            continue

        published_date = datetime(*entry.published_parsed[:6]).date()

        if published_date == date.today() or published_date == date.today() - timedelta(days=1):

            doc = nlp(entry.get("title", "") + " " + entry.get("summary", ""))

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
                category=news_urls["category"],
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

    headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/136.0 Safari/537.36"
        )
    }

    
    async with httpx.AsyncClient(headers=headers) as client:
        for news_url in NEWS_URLS:
            task = asyncio.create_task(fetch_feeds(news_url, client))
            tasks.append(task)

        results =await asyncio.gather(*tasks)

        for result in results:
            all_feeds.extend(result)

    final_feeds = Feeds(feeds=all_feeds)

    print(f"Time taken for Feeds: {time.time() - start} seconds")

    return final_feeds