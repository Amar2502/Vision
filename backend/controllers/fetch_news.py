import asyncio
import json
from datetime import date, datetime, timedelta

import feedparser  # type: ignore
import httpx

from ingestion_source.news import NEWS_URLS
from models import feed
from utils.country_list import country_list
from utils.get_countries import get_countries
from utils.get_importance import get_importance
from database.queries import (
    get_links,
    get_multiple_articles,
    insert_multiple_articles,
)


async def fetch_single_news(
    news_urls,
    client,
    seen_titles,
    seen_links,
    llm,
    lock: asyncio.Lock,
):
    print(f"Fetching feeds for {news_urls['category']}")

    source = news_urls["source"]
    url = news_urls["url"]

    new_feeds = []

    try:
        response = await client.get(url, timeout=20)
        response.raise_for_status()
    except Exception as e:
        print(f"Error fetching feed {url}: {e}")
        return {
            "source": source,
            "feeds": [],
        }

    parsed_feed = feedparser.parse(response.text)

    for entry in parsed_feed.entries:

        link = entry.get("link", "")

        if not link:
            continue

        # Prevent duplicate processing across all running tasks
        async with lock:
            if link in seen_links:
                continue

            seen_links.add(link)

        title = entry.get("title", "")

        async with lock:
            if title in seen_titles:
                continue

            seen_titles.add(title)

        if not entry.get("published_parsed"):
            continue

        published_date = datetime(
            *entry.published_parsed[:6]
        ).date()

        if published_date < date.today() - timedelta(days=1):
            continue

        summary = entry.get("summary", "")

        countries = []

        for country in country_list:
            if (
                country in title.lower()
                or country in summary.lower()
            ):
                countries.append(country)

        if countries:
            importance = get_importance(title, summary)
        else:
            result = await get_countries(
                title,
                summary,
                llm,
            )

            countries = result.countries
            importance = result.importance

        article = feed(
            source=source,
            title=title,
            summary=summary,
            link=link,
            published=datetime(
                *entry.published_parsed[:6]
            ).strftime("%Y-%m-%dT%H:%M:%SZ"),
            category=news_urls["category"],
            country=countries,
            importance=importance,
        )

        new_feeds.append(article)

    # Serialize DB writes
    if new_feeds:
        async with lock:
            insert_multiple_articles(new_feeds)

    return {
        "source": source,
        "feeds": new_feeds,
    }


async def fetch_news(llm):
    """
    Stream format:

    First message:
    {
        "type": "cached",
        "feeds": [...]
    }

    Then:
    {
        "type": "new",
        "source": "...",
        "feeds": [...]
    }
    """

    # Phase 1: immediately stream cached articles
    cached_articles = get_multiple_articles()

    yield (
        json.dumps(
            {
                "type": "cached",
                "feeds": cached_articles,
            },
            default=str,
        )
        + "\n"
    )

    # Existing DB links
    seen_links = set(get_links())

    seen_titles = set()

    lock = asyncio.Lock()

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/136.0 Safari/537.36"
        )
    }

    async with httpx.AsyncClient(
        headers=headers
    ) as client:

        tasks = [
            asyncio.create_task(
                fetch_single_news(
                    news_url,
                    client,
                    seen_titles,
                    seen_links,
                    llm,
                    lock,
                )
            )
            for news_url in NEWS_URLS
        ]

        for task in asyncio.as_completed(tasks):
            result = await task

            if not result["feeds"]:
                continue

            yield (
                json.dumps(
                    {
                        "type": "new",
                        "source": result["source"],
                        "feeds": [
                            article.model_dump()
                            for article in result["feeds"]
                        ],
                    },
                    default=str,
                )
                + "\n"
            )