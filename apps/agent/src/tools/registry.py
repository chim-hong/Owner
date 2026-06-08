from src.schema.tools import GetProjectDetailInputSchema
from src.tools.project import get_project_detail

TOOLS_REGISTRY = {
    "get_project_detail": {
        "name": "get_project_detail",
        "description": "用于查询项目的具体情况",
        "input_schema": GetProjectDetailInputSchema,
        "intent": "project_detail",
        "handler": get_project_detail,
    }
}
