from langchain_ollama import ChatOllama
from pydantic import BaseModel, Field
from typing import List

async def get_countries(heading: str, summary: str, llm: ChatOllama):

    class CountrySchema(BaseModel):
        countries: List[str] = Field(description="List of countries mentioned in the news")
        importance: int = Field(description="Importance score from 0 (low) to 5 (very high)")

    structured_model = llm.with_structured_output(CountrySchema)

    prompt = f"""
    You are a geopolitical intelligence extraction system.

    Extract structured information from the news below.

    Rules:
    - Use ONLY the provided text.
    - Do NOT use external knowledge.
    - Return only valid structured output.

    Task 1:
    Identify all countries and only countries explicitly or implicitly mentioned.

    Task 2:
    Assign importance score:
    0 = trivial local news
    1 = minor event
    2 = national news
    3 = major national event
    4 = international attention
    5 = global crisis / war / major conflict

    News:
    Headline: {heading}
    Summary: {summary}
    """

    output = await structured_model.ainvoke(prompt)

    return output