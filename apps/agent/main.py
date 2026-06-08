import json
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from src.adapter.deepseek_stream_adapter import adapter_deepseek_stream_to_format
from src.adapter.stream_return_adapter import stream_event
from src.services.main import main_service

app = FastAPI(title="Owner Agent")


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None


@app.get("/health")
def health():
    return {
        "service": "agent",
        "status": "ok！！",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/chat")
def chat(request: ChatRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    def stream():
        try:
            results = main_service(request.message, request.thread_id)
            yield from adapter_deepseek_stream_to_format(results)
            yield stream_event({"event": "done", "data": {"content": "传输完毕"}})
        except Exception as exc:
            yield stream_event({"event": "done", "data": "传输失败"})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
        },
    )
