from typing import Any

from pydantic import BaseModel


class CallLLM(BaseModel):
    messages: Any
    structured_output: Any | None
    tools: list[Any] | None
