from langchain_core.messages import AIMessageChunk
from src.adapter.stream_return_adapter import stream_event


def adapter_deepseek_stream_to_format(streams):
    """将deepseek返回的数据格式化成统一的结构

    Args:
        streams (list[Any]): 流数据源数据

    Returns:
        list[StreamFormatResponse] | None: 格式化后的数据
    """
    for item in streams:
        metadata = {}

        if isinstance(item, tuple) and len(item) == 2 and item[0] == "messages":
            chunk, metadata = item[1]
        elif isinstance(item, tuple):
            chunk = item[0]
        else:
            chunk = item

        if not isinstance(chunk, AIMessageChunk):
            continue

        node = metadata.get("langgraph_node")
        reasoning = getattr(chunk, "additional_kwargs", {}).get("reasoning_content")
        if reasoning:
            yield stream_event(
                {"event": "reasoning", "data": {"content": reasoning, "node": node}}
            )

        content = getattr(chunk, "content", None)
        if content:
            yield stream_event({"event": "chunk", "data": {"content": content, "node": node}})
