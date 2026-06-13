import feedparser # type: ignore
from ingestion_source.videos import VIDEOS_URLS
from models import video

def fetch_videos():
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