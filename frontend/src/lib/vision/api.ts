import type {
  ChatStreamEvent,
  EarthquakeEvent,
  FeedItem,
  VideoItem,
} from "./types";
import {
  CHAT_ENDPOINT,
  EARTHQUAKES_ENDPOINT,
  FEEDS_ENDPOINT,
  SUMMARIZE_ENDPOINT,
  VIDEOS_ENDPOINT,
  VIDEOS_SUMMARIZE_ENDPOINT,
} from "./constants";

export const NO_VIDEO_TRANSCRIPT = "No transcript found";

async function parseTextResponse(res: Response): Promise<string> {
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(raw || `HTTP ${res.status}`);
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (
      parsed &&
      typeof parsed === "object" &&
      "error" in parsed &&
      typeof (parsed as { error: unknown }).error === "string"
    ) {
      throw new Error((parsed as { error: string }).error);
    }
    return String(parsed);
  } catch (err) {
    if (err instanceof SyntaxError) return raw.trim();
    throw err;
  }
}

export async function streamFeeds(
  onChunk: (feeds: FeedItem[]) => void
): Promise<FeedItem[]> {
  const res = await fetch(FEEDS_ENDPOINT);
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const all: FeedItem[] = [];

  const ingest = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const chunk = JSON.parse(trimmed) as {
      source?: string;
      feeds?: FeedItem[];
    };
    const incoming = Array.isArray(chunk.feeds) ? chunk.feeds : [];
    if (incoming.length === 0) return;

    all.push(...incoming);
    onChunk(incoming);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      ingest(line);
    }
  }

  buffer += decoder.decode();
  ingest(buffer);

  return all;
}

export async function fetchEarthquakes(): Promise<EarthquakeEvent[]> {
  const res = await fetch(EARTHQUAKES_ENDPOINT);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.earthquakes ?? []);
}

export async function fetchVideos(): Promise<VideoItem[]> {
  const res = await fetch(VIDEOS_ENDPOINT);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? (data as VideoItem[]) : [];
}

export async function summarizeArticle(url: string): Promise<string> {
  const res = await fetch(SUMMARIZE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return parseTextResponse(res);
}

export async function summarizeVideo(id: string): Promise<string> {
  const res = await fetch(VIDEOS_SUMMARIZE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(raw || `HTTP ${res.status}`);
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (
      parsed &&
      typeof parsed === "object" &&
      "error" in parsed &&
      typeof (parsed as { error: unknown }).error === "string"
    ) {
      const message = (parsed as { error: string }).error;
      if (message === NO_VIDEO_TRANSCRIPT) return NO_VIDEO_TRANSCRIPT;
      throw new Error(message);
    }
    return String(parsed);
  } catch (err) {
    if (err instanceof SyntaxError) return raw.trim();
    throw err;
  }
}

function parseSseBlock(block: string): ChatStreamEvent | null {
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;

    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr) continue;

    return JSON.parse(jsonStr) as ChatStreamEvent;
  }

  return null;
}

export async function streamChat(
  inputQuery: string,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input_query: inputQuery }),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const ingest = (block: string) => {
    const event = parseSseBlock(block);
    if (event) onEvent(event);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex: number;
    while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      ingest(block);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) ingest(buffer);
}
