from pydantic import BaseModel
from typing import List, Optional

class feed(BaseModel):
    source: str
    title: str
    summary: str
    link: str
    published: str
    category: str

class Feeds(BaseModel):
    feeds: List[feed]

class earthquakeEvent(BaseModel):
    magnitude: float
    place: str
    time: int
    felt: Optional[int]
    cdi: Optional[float]
    coordinates: List[float]

class wildfireEvent(BaseModel):
    title: str
    description: Optional[str]
    source: str
    magnitudeValue: Optional[float]
    magnitudeUnit: Optional[str]
    date: str
    coordinates: List[float]

class flightEvent(BaseModel):
    callsign: Optional[str]
    origin_country: str
    time_position: Optional[int]
    longitude: float
    latitude: float
    geo_altitude: Optional[float]
    on_ground: bool
    velocity: Optional[float]
    true_track: Optional[float]
    vertical_rate: Optional[float]