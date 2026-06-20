from langchain_core.tools import tool
from datetime import datetime
from exa_py import Exa # type: ignore
from dotenv import load_dotenv
import json
import os
from database.database import get_connection

from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_community.tools import ArxivQueryRun
from langchain_community.utilities import ArxivAPIWrapper
from langchain_community.tools import YahooFinanceNewsTool


load_dotenv()

EXA_API_KEY = os.getenv("EXA_AI_API_KEY")
MAX_NEWS_RESULTS = 7

wiki = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper())

arxiv = ArxivQueryRun(api_wrapper=ArxivAPIWrapper())

yahoo_finance_news = YahooFinanceNewsTool()

def _row_to_article(row) -> dict:
    data = dict(row)
    data.pop("id", None)

    country = data.get("country")
    if isinstance(country, str):
        try:
            data["country"] = json.loads(country)
        except json.JSONDecodeError:
            pass

    return data


def _fetch_articles(where_clause: str, params: tuple) -> list[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        f"""
        SELECT * FROM articles
        WHERE {where_clause}
          AND datetime(published) >= datetime('now', '-1 day')
        ORDER BY importance DESC, published DESC
        LIMIT ?
        """,
        (*params, MAX_NEWS_RESULTS),
    )
    rows = cursor.fetchall()
    conn.close()

    return [_row_to_article(row) for row in rows]


@tool
def get_date_and_time():
    """
    Get the current date and time.
    """
    return {"date": datetime.now().date(), "time": datetime.now().time()}


@tool
def search_web(query: str):
    """
    Search the web for information.
    """
    exa = Exa(EXA_API_KEY)

    result = exa.search(
        query,
        num_results=10,
        type="auto",
        contents={
            "highlights": True,
        },
    )

    return result


@tool
def get_latest_news_for_country(country: str):
    """
    Get the latest last 24 hours news for a specific country.
    """
    return _fetch_articles("country LIKE ?", (f"%{country}%",))


@tool
def get_latest_news_for_category(category: str):
    """
    Get the latest last 24 hours news for a specific category.
    """
    return _fetch_articles("category LIKE ?", (f"%{category}%",))


@tool
def get_latest_news_for_source(source: str):
    """
    Get the latest last 24 hours news for a specific source.
    """
    return _fetch_articles("source LIKE ?", (f"%{source}%",))


@tool
def get_latest_news_for_importance(importance: int):
    """
    Get the latest last 24 hours news for a specific importance.
    """
    return _fetch_articles("importance = ?", (importance,))


@tool
def get_latest_news():
    """
    Get the latest last 24 hours news.
    """
    return _fetch_articles("1 = 1", ())
