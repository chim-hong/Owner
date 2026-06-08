from src.config.main import CONFIG
from src.prompts.registry import PROMPTS_REGISTRY
from src.tools.registry import TOOLS_REGISTRY


def get_prompt(prompt_name: str) -> str:
    return PROMPTS_REGISTRY[CONFIG[prompt_name]["prompt"]]["template"]


def get_tool_registry(_tool_name):
    print(_tool_name)
    tools = [
        tool_registry
        for tool_name, tool_registry in TOOLS_REGISTRY.items()
        if tool_name == _tool_name
    ]
    return tools[0]
