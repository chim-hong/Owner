from src.graphs.main import main_builder
from src.states.main import create_main_state

main_agent = main_builder()

THREAD_ID = "user1"


def main_service(input, thread_id=None):
    history_state = None
    if thread_id:
        history_state = main_agent.get_state(
            config={"configurable": {"thread_id": thread_id}}
        )
        history_state = history_state.values.get("messages")
    state = create_main_state(input, history_state, thread_id)
    return main_agent.stream(
        state,
        stream_mode=["messages", "updates"],
        config={"configurable": {"thread_id": thread_id}},
    )
