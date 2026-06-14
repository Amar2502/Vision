from pydantic import BaseModel
from typing import List, Optional

class feed(BaseModel):
    source: str
    title: str
    summary: str
    link: str
    published: str
    category: str
    country: Optional[List[str]]
    importance: int

class video(BaseModel):
    id: str
    link: str
    title: str
    published: str
    summary: str
    source: str

class earthquakeEvent(BaseModel):
    magnitude: float
    place: str
    time: int
    felt: Optional[int]
    cdi: Optional[float]
    coordinates: List[float]