import feedparser # type: ignore
from ingestion_source.videos import VIDEOS_URLS
from models import video
import httpx

async def fetch_videos():
    videos = []

    async with httpx.AsyncClient() as client:
        for feed in VIDEOS_URLS:
            response = await client.get(feed["url"])

            if response.status_code != 200:
                continue

            parsed_feed = feedparser.parse(response.text)

            for entry in parsed_feed.entries:
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

    return videos