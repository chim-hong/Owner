import json


def stream_event(stream):
    return f"event: {stream['event']}\ndata: {json.dumps(stream['data'], ensure_ascii=False)}\n\n"
