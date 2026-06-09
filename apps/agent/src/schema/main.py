from typing import Annotated, Any, Literal, TypedDict

from langchain.messages import ToolCall
from langgraph.graph import MessagesState
from pydantic import BaseModel, Field


class Project(BaseModel):
    key: (
        Literal["trustdecision-portal", "aicube", "trustdecision-oper", "td-ui"] | None
    ) = Field(default=None, description="type=project时必填，其他情况为None")
    name: str | None = Field(
        default=None, description="type=project时必填，其他情况为None"
    )
    description: str | None = Field(
        default=None, description="type=project时必填，其他情况为None"
    )


IntentType = (Literal["project_detail", "contact", "basic_info"] | None,)


class IntentRecognitionResult(BaseModel):
    intent_type: Literal["project_detail", "contact", "basic_info"] | None = Field(
        default=None,
        description="意图识别类型：project_detail为查询具体项目信息；contact为获取联系方式；basic_info为查询基本信息，包括身份信息、技能信息、项目信息；其他为None",
    )
    result: Project | None = Field(
        default=None, description="type=project_detail时必填，其他情况为None"
    )


class IntentRecognitionOutput(BaseModel):
    intents: list[IntentRecognitionResult]


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
    intent_recognition: IntentRecognitionOutput | None
    thread_id: str | None
    tool_call: list[ToolCall] | None
    tool_result: Any | None
    # retrieval_chunks: list[Chunk]
    # rerank_chunks:list[Chunk]
    # selected_chunks:list[Chunk]


class StreamFormatResponse(TypedDict):
    event: Literal["reasoning", "answer", "final"]
    data: str
    data: str
    data: str
