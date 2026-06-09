from pathlib import Path

from langchain_community.tools import tool
from src.schema.tools import GetProjectDetailInputSchema, ProjectDetailResult

PROJECT_DOCS_DIR = Path(__file__).resolve().parents[1] / "docs"
PROJECT_DOC_MAP = {
    "trustdecision-portal": "trustDecision_portal.md",
    "basic_info": "basic_info.json",
}


@tool(args_schema=GetProjectDetailInputSchema)
def get_project_detail(project_name) -> ProjectDetailResult:
    """获取项目详情

    Args:
        project_name (GetProjectDetailInputSchema): 项目名称

    Returns:
        _type_: 项目详情
    """
    print("project_name", project_name)

    result: ProjectDetailResult = {"success": False, "content": None}

    if not project_name:
        result["content"] = "项目名称为空，无法读取项目文档。"
        return result

    doc_filename = PROJECT_DOC_MAP.get(project_name)
    if not doc_filename:
        result["content"] = f"项目 {project_name} 暂未配置对应的 Markdown 文档。"
        return result

    doc_path = PROJECT_DOCS_DIR / doc_filename
    if not doc_path.exists():
        result["content"] = f"项目 {project_name} 的文档文件不存在：{doc_filename}。"
        return result

    result["content"] = doc_path.read_text(encoding="utf-8")
    result["success"] = True
    return result


@tool
def get_contact() -> ProjectDetailResult:
    """获取联系方式

    Returns:
        str: 联系方式
    """

    return ProjectDetailResult(success=True, content="123@tongdun.net")
