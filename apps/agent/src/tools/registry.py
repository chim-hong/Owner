from src.schema.tools import GetProjectDetailInputSchema
from src.tools.main import get_contact, get_project_detail

TOOLS_REGISTRY = {
    "get_project_detail": {
        "name": "get_project_detail",
        "description": "用于查询项目的具体情况",
        "input_schema": GetProjectDetailInputSchema,
        "intent": ["project_detail", "basic_info"],
        "handler": get_project_detail,
    },
    "get_contact": {
        "name": "get_contact",
        "description": "用于获取联系方式",
        "intent": "contact",
        "handler": get_contact,
    },
}
