from dotenv import load_dotenv

from langchain.agents import create_agent
from langchain_groq import ChatGroq # type: ignore
from .tools import *

load_dotenv()

_agent = None


def _build_agent():
    tools = [
        get_date_and_time,
        search_web,
        get_latest_news_for_country,
        get_latest_news_for_category,
        get_latest_news_for_source,
        get_latest_news_for_importance,
        get_latest_news,
        wiki,
        arxiv,
        yahoo_finance_news,
    ]

    llm = ChatGroq(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        temperature=0,
    )

    return create_agent(
        model=llm,
        tools=tools,
        name="Vision",
    )


async def get_agent():
    global _agent
    if _agent is None:
        _agent = _build_agent()
    return _agent
