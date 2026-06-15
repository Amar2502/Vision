from database.database import get_connection
from models import feed
import json

def insert_multiple_articles(articles):
    conn = get_connection()
    cursor = conn.cursor()

    for article in articles:

        cursor.execute(
            """
            INSERT OR IGNORE INTO articles 
            (title, summary, link, source, published, category, country, importance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                article.title,
                article.summary,
                article.link,
                article.source,
                article.published,
                article.category,
                json.dumps(article.country),  # FIX HERE
                article.importance,
            ),
        )

    conn.commit()
    conn.close()

    return "Articles inserted successfully"

def insert_article(article: feed):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("INSERT OR IGNORE INTO articles (title, summary, link, source, published, category, country, importance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (article.title, article.summary, article.link, article.source, article.published, article.category, json.dumps(article.country), article.importance))

    conn.commit()
    conn.close()

    return "Article inserted successfully"

def _row_to_feed_dict(row) -> dict:
    data = dict(row)
    data.pop("id", None)

    country = data.get("country")
    if isinstance(country, str):
        data["country"] = json.loads(country) if country else None

    return feed(**data).model_dump()


def get_multiple_articles():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM articles where datetime(published) >= datetime('now', '-1 day')")

    articles = [_row_to_feed_dict(row) for row in cursor.fetchall()]

    conn.close()

    return articles

def get_article(link: str):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM articles WHERE link = ?", (link,))
    article = cursor.fetchone()

    conn.close()

    return article

def get_links():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT link FROM articles where datetime(published) >= datetime('now', '-1 day')")

    links = {row[0] for row in cursor.fetchall()} 

    conn.close()

    return links
