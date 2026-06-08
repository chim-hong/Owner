from typing import Literal, TypedDict

from pydantic import BaseModel


class GetProjectDetailInputSchema(BaseModel):
    project_name: (
        Literal["trustdecision-portal", "trustdecision-oper", "aicube", "td-ui"] | None
    )


class ProjectDetailResult(TypedDict):
    success: bool
    content: str | None
