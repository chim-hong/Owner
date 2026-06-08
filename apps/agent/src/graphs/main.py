from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph
from src.graphs.nodes.main import add_main_agent
from src.schema.main import MainAgentState

checkpointer = MemorySaver()


def main_builder():
    builder = StateGraph(MainAgentState)
    add_main_agent(builder)
    return builder.compile(checkpointer)
