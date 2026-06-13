import asyncio
import feedparser # type: ignore
import time
from ingestion_source.news import NEWS_URLS
import httpx
from models import feed
from datetime import date, datetime, timedelta
import json
from utils.get_countries import get_countries

async def fetch_single_news(news_urls, client, seen_titles, llm):

    local_feeds = []

    print(f"Fetching feeds for {news_urls['category']}")

    source = news_urls["source"]
    url = news_urls["url"]

    response = await client.get(url)
    parsed_feed = feedparser.parse(response.text)

    for entry in parsed_feed.entries:

        title = entry.get("title", "")

        if title in seen_titles:
            continue

        seen_titles.add(title)

        if not entry.get("published_parsed"):
            continue

        published_date = datetime(*entry.published_parsed[:6]).date()

        if published_date == date.today() or published_date == date.today() - timedelta(days=1):

            result = await get_countries(title, entry.get("summary", ""), llm)
            importance = result.importance
            countries = result.countries

            response_feed = feed(
                source=source,
                title=entry.get("title", ""),
                summary=entry.get("summary", ""),
                link=entry.get("link", ""),
                published=entry.get("published", ""),
                category=news_urls["category"],
                country=countries,
                importance=importance
            )

            local_feeds.append(response_feed.model_dump())

    return {
        "source": source,
        "feeds": local_feeds
    }


async def fetch_news(llm):

    seen_titles = set()

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
            task = asyncio.create_task(fetch_single_news(news_url, client, seen_titles, llm))
            tasks.append(task)

        for task in asyncio.as_completed(tasks):
            result = await task

            yield json.dumps({
                "source": result["source"],
                "feeds": result["feeds"]
            }) + "\n"