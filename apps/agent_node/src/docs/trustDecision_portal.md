# TrustDecision Portal Web 项目分析报告

> 面试官视角 · 2026年4月22日

## 一、项目概览

**项目名称：** TrustDecision Portal Web（小盾场景化客户平台）
**版本：** 3.2.10
**定位：** 企业级风控 SaaS 平台，面向欺诈检测和风险控制领域
**产品线数量：** 11 个独立业务产品线

**核心技术栈：**

| 类别 | 技术选型 |
|------|----------|
| 框架 | React 18 + TypeScript |
| 构建工具 | Vite（开发）/ 自定义 Webpack（生产） |
| UI 组件 | Ant Design 4.24 + 自建 xdad 组件库 + Semi UI |
| 状态管理 | Zustand |
| 路由 | React Router v6（动态菜单驱动） |
| HTTP 请求 | umi-request + 自定义拦截器 |
| 国际化 | kiwi-intl（zh-CN / en-US / zh-TW） |
| 图表 | ECharts + @ant-design/charts |
| 图编辑 | @antv/x6 |
| Hooks | ahooks |
| 样式 | Less + CSS Modules（camelCase） |

## 二、项目亮点

### 动态菜单驱动的路由架构

路由不是硬编码的，而是由后端菜单配置在运行时动态生成，结合版本权限门控。后端菜单拉取后动态组装路由树，每个叶子路由节点注入运行时版本判断。

### 三层版本体系

支持 Standard、Professional、Enterprise 三档版本。版本状态按产品路径独立维护，并持久化到 localStorage。访问未授权功能时显示升级引导或功能未开通页面。

### createService 统一 HTTP 封装

统一注入多租户请求头，支持 GET、POST、Form-Data，响应拦截器处理文件下载、401 登录过期、版本配额错误码和业务通用错误。

### 自建 xdad 组件库

在 Ant Design 基础上封装了 MultiFunctionalTable、AdvancedSearch、PenetrationSearch、ClickToDesensitizeButton、SearchBar、MultiSelect、DateRange 等业务组件。

### AI 规则助手

用户输入自然语言风险描述后，LLM 返回具体风控规则配置。系统支持多条候选规则、批量应用、配额校验和 feedback 上报，通过 aiRuleUuid 追踪每条 AI 规则的采纳率。

### 图谱可视化

使用 @antv/x6 展示订单、手机号、邮箱、IP、设备、账号、姓名、银行卡、地址等多维关联关系，并通过独立 store 管理图谱状态。

## 三、总结

这是一个业务复杂度高、工程化规范完善的企业级 SaaS 项目。核心亮点是 AI 规则助手与风控业务深度集成、动态路由与三层版本权限体系，以及 OpenSpec 驱动的 AI 辅助研发流程。
