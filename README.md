# Personal Agent

一个个人 Agent 项目框架，分为前端、后端和 Agent 服务。

## 结构

- `apps/web`: 前端页面，负责用户交互。
- `apps/api`: 后端服务，负责 API、业务入口和调用 Agent 服务。
- `apps/agent`: Python Agent 服务，负责 AI / Agent 能力。
- `packages/shared`: 三个服务复用的类型和常量。

## 本地启动

```bash
npm install

cd apps/agent
python3 main.py
```

另开一个终端，在项目根目录启动 Node 服务：

```bash
npm run dev
```

默认端口：

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- Agent: `http://localhost:4000`

## 部署

仓库已包含 GitHub Pages 工作流，用于部署 `apps/web`。

后端需要部署到支持 Node.js 服务的平台，Agent 需要部署到支持 Python HTTP 服务的平台，例如 Render、Railway 或 Fly.io。部署后，把前端环境变量 `VITE_API_BASE_URL` 指向后端公网地址，把后端环境变量 `AGENT_SERVICE_URL` 指向 Agent 服务公网地址。
