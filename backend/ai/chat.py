import json

from .llm import get_agent
from .systemprompt import system_prompt


def _sse_event(payload: dict) -> str:
    return f"data: {json.dumps(payload, default=str)}\n\n"


async def chat(input_query: str):
    agent = await get_agent()

    input_data = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": input_query},
        ]
    }

    try:
        async for event in agent.astream_events(input_data, version="v2"):
            event_type = event.get("event")

            if event_type == "on_tool_start":
                yield _sse_event({
                    "event": "on_tool_start",
                    "name": event["name"],
                })

            if event_type == "on_tool_end":
                yield _sse_event({
                    "event": "on_tool_end",
                    "name": event["name"],
                    "output": event.get("data", {}).get("output", ""),
                })

            if event_type == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                token = getattr(chunk, "content", "")
                if token:
                    yield _sse_event({
                        "event": "on_chat_model_stream",
                        "data": {
                            "chunk": {
                                "content": token,
                            }
                        },
                    })

            if event_type == "on_chat_model_end":
                yield _sse_event({"event": "on_chat_model_end"})

    except Exception as exc:
        yield _sse_event({
            "event": "error",
            "message": str(exc),
        })
