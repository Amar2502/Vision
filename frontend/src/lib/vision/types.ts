export interface FeedItem {
  source: string;
  title: string;
  link: string;
  summary?: string;
  published?: string;
  category?: string;
  media_url?: string;
  media?: string;
  country?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface EarthquakeEvent {
  magnitude: number;
  place: string;
  time: number;
  felt?: number | null;
  cdi?: number | null;
  coordinates: number[];
}

export interface WildfireEvent {
  title: string;
  description?: string;
  source?: string;
  magnitudeValue?: number | null;
  magnitudeUnit?: string | null;
  date?: string;
  coordinates: number[];
}

export interface FlightEvent {
  callsign?: string | null;
  geo_altitude?: number | null;
  latitude: number;
  longitude: number;
  on_ground: boolean;
  origin_country?: string;
  time_position?: number | null;
  true_track?: number | null;
  velocity?: number | null;
  vertical_rate?: number | null;
}

export interface VideoItem {
  id: string;
  link: string;
  title: string;
  published?: string;
  summary?: string;
  source: string;
}

export type HazardTab = "news" | "earthquake" | "wildfire" | "flight";

export interface TabMeta {
  subtitle: string;
  endpoint: string;
  empty: string;
  fail: string;
  loading: string;
  overlayText: string;
  eventLabel: string;
  eventLabelPlural: string;
}
