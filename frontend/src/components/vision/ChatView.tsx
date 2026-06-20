"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { streamChat } from "@/lib/vision/api";
import type { ChatMessage } from "@/lib/vision/types";
import { ChatMarkdown } from "@/components/vision/ChatMarkdown";
import { ToolCallsLog } from "@/components/vision/ToolCallsLog";

const TOOL_LABELS: Record<string, string> = {
  get_date_and_time: "Checking date and time",
  search_web: "Searching the web",
  get_latest_news_for_country: "Fetching country news",
  get_latest_news_for_category: "Fetching category news",
  get_latest_news_for_source: "Fetching source news",
  get_latest_news_for_importance: "Fetching priority news",
  get_latest_news: "Fetching latest news",
  WikipediaQueryRun: "Searching Wikipedia",
  ArxivQueryRun: "Searching arXiv",
  YahooFinanceNewsTool: "Fetching finance news",
};

function formatToolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, " ");
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const STARTER_PROMPTS = [
  "What are the top stories in the last 24 hours?",
  "Summarize recent news about India.",
  "What major earthquakes happened recently?",
];

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const assistantIdRef = useRef<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const updateAssistant = useCallback(
    (updater: (message: ChatMessage) => ChatMessage) => {
      const assistantId = assistantIdRef.current;
      if (!assistantId) return;

      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId ? updater(message) : message
        )
      );
    },
    []
  );

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || streaming) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage: ChatMessage = {
        id: createId(),
        role: "user",
        content: text,
      };
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: "",
        toolCalls: [],
        streamingStarted: false,
      };

      assistantIdRef.current = assistantMessage.id;
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput("");
      setStreaming(true);

      try {
        await streamChat(
          text,
          (event) => {
            if (event.event === "on_tool_start") {
              updateAssistant((message) => ({
                ...message,
                toolCalls: [
                  ...(message.toolCalls ?? []),
                  {
                    id: createId(),
                    name: event.name,
                    label: formatToolLabel(event.name),
                    status: "running",
                  },
                ],
              }));
            }

            if (event.event === "on_tool_end") {
              updateAssistant((message) => {
                const toolCalls = [...(message.toolCalls ?? [])];
                const reverseIndex = [...toolCalls]
                  .reverse()
                  .findIndex(
                    (tool) =>
                      tool.name === event.name && tool.status === "running"
                  );

                if (reverseIndex >= 0) {
                  const index = toolCalls.length - 1 - reverseIndex;
                  toolCalls[index] = {
                    ...toolCalls[index],
                    status: "done",
                    output: event.output,
                  };
                }

                return { ...message, toolCalls };
              });
            }

            if (event.event === "on_chat_model_stream") {
              const token = event.data?.chunk?.content ?? "";
              if (!token) return;

              updateAssistant((message) => ({
                ...message,
                streamingStarted: true,
                content: message.content + token,
              }));
            }

            if (event.event === "error") {
              updateAssistant((current) => ({
                ...current,
                streamingStarted: true,
                content: current.content || event.message,
                error: true,
              }));
            }
          },
          controller.signal
        );
      } catch (err) {
        if (controller.signal.aborted) return;

        const message =
          err instanceof Error ? err.message : "Something went wrong.";

        updateAssistant((current) => ({
          ...current,
          streamingStarted: true,
          content: current.content || message,
          error: true,
        }));
      } finally {
        setStreaming(false);
        assistantIdRef.current = null;
      }
    },
    [streaming, updateAssistant]
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void sendMessage(input);
    },
    [input, sendMessage]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  return (
    <section className="relative flex flex-col h-[calc(100vh-120px)] min-h-[520px] overflow-hidden rounded-md bg-[#11151f] border border-[#1f2533] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-[#22c55e] before:opacity-85">
      <div className="flex items-center justify-between gap-2 py-3 px-4 border-b border-[#1a1f2b]">
        <div>
          <div className="text-xs font-bold tracking-[1.4px] uppercase text-[#e6e9ef]">
            Vision Agent
          </div>
          <p className="text-[11px] text-[#5b6273] mt-1">
            Ask about live news, countries, categories, web search, and more.
          </p>
        </div>
        {streaming ? (
          <span className="text-[10px] font-semibold uppercase tracking-[1px] text-[#22c55e] py-1 px-2 rounded-[10px] bg-[#22c55e]/10 border border-[#22c55e]/25">
            Streaming
          </span>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin [scrollbar-color:#2a3245_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#232a3a] [&::-webkit-scrollbar-thumb]:rounded-[3px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="text-sm text-[#8a93a6] max-w-md">
              Start a conversation with Vision. The agent can query your news
              database, search the web, and summarize what it finds.
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-5 max-w-2xl">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={streaming}
                  onClick={() => void sendMessage(prompt)}
                  className="text-left text-xs text-[#c7cedb] bg-[#161b27] border border-[#1f2533] rounded-md px-3 py-2 transition-colors duration-200 hover:border-[#22c55e]/40 hover:text-[#22c55e] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const showToolCalls =
              message.role === "assistant" &&
              !message.streamingStarted &&
              (message.toolCalls?.length ?? 0) > 0;
            const showStream =
              message.role === "assistant" &&
              message.streamingStarted &&
              !!message.content;
            const showThinking =
              message.role === "assistant" &&
              !message.streamingStarted &&
              (message.toolCalls?.length ?? 0) === 0 &&
              streaming;

            return (
              <div
                key={message.id}
                className={[
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                ].join(" ")}
              >
                <div
                  className={[
                    "max-w-[85%] rounded-lg px-3.5 py-2.5 text-[13px] leading-[1.55] border",
                    message.role === "user"
                      ? "bg-[#1a2333] text-[#e6e9ef] border-[#2a3245] whitespace-pre-wrap wrap-break-word"
                      : message.error
                        ? "bg-[#241818] text-[#fca5a5] border-[#7f1d1d]/50 whitespace-pre-wrap wrap-break-word"
                        : "bg-[#161b27] text-[#e6e9ef] border-[#1f2533]",
                  ].join(" ")}
                >
                  {showToolCalls ? (
                    <ToolCallsLog tools={message.toolCalls ?? []} />
                  ) : null}

                  {showStream ? (
                    message.error ? (
                      message.content
                    ) : (
                      <ChatMarkdown content={message.content} />
                    )
                  ) : null}

                  {message.role === "user" ? message.content : null}

                  {showThinking ? (
                    <span className="inline-flex items-center gap-1 text-[#8a93a6]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                      Thinking
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-[#1a1f2b] p-4 bg-[#0f131c]"
      >
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Vision about news, countries, markets, or current events..."
            rows={2}
            disabled={streaming}
            className="flex-1 resize-none rounded-md bg-[#161b27] border border-[#1f2533] text-[#e6e9ef] text-[13px] px-3 py-2.5 outline-none transition-[border-color] duration-200 focus:border-[#22c55e]/50 disabled:opacity-60 placeholder:text-[#5b6273]"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="shrink-0 bg-[#161b27] text-[#e6e9ef] border border-[#1f2533] py-2.5 px-4 rounded-md cursor-pointer text-xs font-semibold uppercase tracking-[0.8px] transition-[color,border-color] duration-200 hover:border-[#22c55e] hover:text-[#22c55e] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <p className="text-[10px] text-[#5b6273] mt-2">
          Enter to send · Shift+Enter for a new line
        </p>
      </form>
    </section>
  );
}
