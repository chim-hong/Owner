# Agent Service

Python Agent 服务，负责 AI / Agent 能力。

## 本地启动

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 4000
```

接口：

- `GET /health`
- `POST /chat`
