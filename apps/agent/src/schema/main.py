import enum
from typing import Any, Literal, TypedDict

from langchain.messages import ToolCall
from langgraph.graph import MessagesState
from pydantic import BaseModel


class Project(BaseModel):
    key: Literal["trustdecision-portal", "aicube", "trustdecision-oper", "td-ui"]
    name: str
    description: str


class Chunk(TypedDict):
    doc_id: str
    chunk_id: str


class Response(TypedDict):
    message: str
    success: bool
    state: Literal[200, 400, 500]
    data: Any
    thread_id: str


class MainAgentState(MessagesState):
    input: str  # 用户输入
    response: Response | None
    intent_recognition: Project | None
    thread_id: str | None
    tool_call: list[ToolCall] | None
    tool_result: Any | None
    # retrieval_chunks: list[Chunk]
    # rerank_chunks:list[Chunk]
    # selected_chunks:list[Chunk]


class StreamFormatResponse(TypedDict):
    event: Literal["reasoning", "answer", "final"]
    data: str
