from langchain.messages import AnyMessage, SystemMessage
from src.schema.main import MainAgentState
from src.utils.main import get_prompt


def create_main_state(input, history_state, thread_id) -> MainAgentState:
    system_message = SystemMessage(content=get_prompt("main"))

    def format_messages() -> list[AnyMessage]:
        if history_state:
            return history_state
        return [system_message]

    state: MainAgentState = {
        "input": input,
        "messages": format_messages(),
        "response": None,
        "thread_id": thread_id,
        "intent_recognition": None,
        "tool_call": None,
        "tool_result": None,
    }
    return state
