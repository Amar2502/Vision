export interface FeedItem {
  source: string;
  title: string;
  link: string;
  summary?: string;
  published?: string;
  category?: string;
  country?: string[] | null;
  importance?: number;
}

export interface EarthquakeEvent {
  magnitude: number;
  place: string;
  time: number;
  felt?: number | null;
  cdi?: number | null;
  coordinates: number[];
}

export interface VideoItem {
  id: string;
  link: string;
  title: string;
  published?: string;
  summary?: string;
  source: string;
}
