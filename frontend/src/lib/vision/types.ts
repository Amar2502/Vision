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

export type VisionTab = "news" | "chat";

export type ChatStreamEvent =
  | { event: "on_tool_start"; name: string }
  | { event: "on_tool_end"; name: string; output: unknown }
  | {
      event: "on_chat_model_stream";
      data: { chunk: { content: string } };
    }
  | { event: "on_chat_model_end" }
  | { event: "error"; message: string };

export interface ToolCallEntry {
  id: string;
  name: string;
  label: string;
  status: "running" | "done";
  output?: unknown;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallEntry[];
  streamingStarted?: boolean;
  error?: boolean;
}
