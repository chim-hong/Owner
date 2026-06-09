import os

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from src.schema.utils import CallLLM

load_dotenv()

LLM_API_KEY = os.getenv("LLM_API_KEY")
print("LLM_API_KEY", LLM_API_KEY)
os.environ["DEEPSEEK_API_KEY"] = "sk-b0016f4625734374837699c4eb7a435b"
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-v4-flash")
LLM_API_BASE_URL = os.getenv("LLM_API_BASE_URL")


thinking_client = init_chat_model(
    model=LLM_MODEL,
    model_provider="deepseek",
    streaming=True,
)

chat_client = init_chat_model(
    model=LLM_MODEL,
    model_provider="deepseek",
    streaming=False,
    extra_body={"thinking": {"type": "disabled"}},
)


def call_llm(config: CallLLM):
    if config.structured_output:
        return chat_client.with_structured_output(config.structured_output).invoke(
            config.messages
        )
    if config.tools:
        return chat_client.bind_tools(config.tools).invoke(config.messages)
    result = thinking_client.invoke(config.messages)
    return result
