# Owner Agent Node

Node.js implementation of the Agent service. It keeps the same HTTP contract as
the Python Agent:

- `GET /health`
- `POST /chat`
- SSE events: `reasoning`, `chunk`, `done`

Run locally:

```bash
pnpm --filter @personal-agent/agent-node dev
```

Use a different port if the Python Agent is already using `4000`:

```bash
AGENT_NODE_PORT=4001 pnpm --filter @personal-agent/agent-node dev
```
