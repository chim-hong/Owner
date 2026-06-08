# TrustDecision Portal Web 项目分析报告

> 面试官视角 · 2026年4月22日

---

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

---

## 二、项目亮点

### 亮点 1：动态菜单驱动的路由架构（★★★★）

**核心设计：** 路由不是硬编码的，而是由后端菜单配置在运行时动态生成，结合版本权限门控。

**运行流程：**

```
Auth.tsx 挂载 → fetchMenus() 拉取后端菜单
→ getRoutes() 动态组装路由树
→ wrapRoutesWithElement() 递归遍历路由树
→ 每个叶子路由节点注入 WrappedElement HOC
→ WrappedElement 运行时读取 EditionMap 决定渲染内容
```

**技术价值：**

- 后端驱动前端路由，解决多产品、多版本菜单的动态扩展问题
- 新增产品线无需修改前端路由配置，只需后端菜单数据变更
- 权限控制在路由层面统一收口，避免分散在各业务组件中

---

### 亮点 2：三层版本体系（EditionMap）设计（★★★★）

**三档版本：** Standard（标准版）/ Professional（专业版）/ Enterprise（企业版）

**设计要点：**

```typescript
// initCurProductEditionMap 核心逻辑：
// 1. 从 localStorage 读取历史版本
// 2. 校验 localStorage 版本是否在菜单允许范围内（避免降级场景下的错误版本）
// 3. 无值时优先选 Enterprise，否则取菜单第一个版本
// 4. 持久化到 localStorage 保证刷新不丢失
```

**版本门控效果：**

- Standard 版用户访问 Enterprise 功能 → 显示升级引导页（图片+文案）
- `auth: false` 的菜单项 → 显示"功能未开通"页面
- 各产品路径（path）独立维护版本状态，互不干扰

---

### 亮点 3：createService 统一 HTTP 封装 + 完善拦截器体系（★★★★）

**统一工厂函数 `createService`：**

- 自动注入多租户请求头：`partner-code`、`lang`、`timezone`、`Business-Product-Edition`
- 支持 GET/POST/Form-Data 三种请求格式
- 使用 Zustand 的 `getState()` 直接在非组件环境中读取状态

**响应拦截器亮点：**

| 场景 | 处理方式 |
|------|----------|
| 文件下载 | 识别 `Content-Disposition`，自动解析文件名，返回 `{data: Blob, filename}` |
| 401 登录过期 | 单例 Modal（防止并发请求触发多个弹窗），清理 Cookie/localStorage，重定向登录页 |
| 版本配额错误码 | `ERROR_CODE` 数组精细化定义（11509/11511/11603 等），特殊透传不 reject |
| 业务通用错误 | 自动 `message.error(msg)` + `Promise.reject` |

**关键细节——单例 Modal 防重复弹窗：**

```typescript
let modalInstance; // 闭包变量
if (!success && code === 401) {
  if (!modalInstance) { // 只创建一次
    modalInstance = Modal.confirm({ ... });
  }
  return Promise.reject(new Error()); // 空 Error 阻止业务层 message.error
}
```

---

### 亮点 4：自建 xdad 组件库（50+ 组件）（★★★★）

在 Ant Design 基础上封装了大量高复用业务场景组件：

| 组件 | 核心能力 |
|------|----------|
| `MultiFunctionalTable` | 列显示/隐藏设置、列锁定、穿透点击、表格数据下载、横向滚动按钮 |
| `AdvancedSearch` | 高级筛选弹出层，URL 参数持久化、localStorage 保存、时间戳格式化、外部 Form 支持 |
| `PenetrationSearch` | 跨模块跳转，携带完整搜索上下文（时间范围+筛选条件）编码到 URL |
| `ClickToDesensitizeButton` | 一键切换当前页面数据脱敏状态，按路径独立管理 |
| `SearchBar` | 搜索条，支持 localStorage 历史记录保存 |
| `MultiSelect` | 多选下拉，Pill 风格 |
| `DateRange` | 日期范围选择，集成时区处理 |

---

### 亮点 5：AI 规则助手与风控业务深度集成（★★★★★ 最突出亮点）

**业务场景：** 用户在配置风控策略规则时，输入自然语言描述风险场景，LLM 返回具体的风控规则配置。

**完整交互流程：**

```
用户输入风险描述
  → POST /llmBridge/rag/rule/simple（携带 subPolicyId 精准定位策略）
  → 返回 RuleData[] 数组（支持多条候选规则）
  → 单条规则（length === 1）：保持原有展示样式
  → 多条规则（length >= 2）：Checkbox 多选 + 批量应用按钮
  → 点击"使用规则"：三态配额校验
      ├── 配额 = 0：红色 error banner，不关闭对话框
      ├── 配额不足（< 选中数）：应用前 N 条，黄色 warning banner 提示剩余
      └── 配额充足：全部应用，关闭对话框
  → 每条规则独立上报 feedback（like/unlike/adopted），使用 aiRuleUuid 追踪
```

**工程细节：**

- `buildPolicyConditions`：同名规则自动追加序号（`baseName1`、`baseName2`）避免重复
- `formatScore`：处理风险分值的枚举值（High/Medium/Low）与自定义数值双模式
- Semi UI `AIChatDialogue` + `AIChatInput` 提供聊天 UI 基础组件

**数据价值：** `aiRuleUuid` + `operation` 字段追踪每条 AI 规则的采纳率，形成 LLM 效果优化的数据闭环。

---

### 亮点 6：图谱可视化（@antv/x6）（★★★★）

**功能：** 关联图谱展示（订单、手机号、邮箱、IP、设备、账号、姓名、银行卡、地址等多维关联关系）

**独立 store 管理图谱状态：**

```typescript
// store/graph.ts
- tabValue: 视图模式（view/list）
- searchParams: 图谱搜索参数（含时区处理）
- nodeNums: 各节点类型数量统计
- ALL_RELATIVE_MEDIUMS: 9 种关联媒介
- initRelativeMediums: 默认展示的 7 种
```

**时间范围计算：** 结合 Cookie 中的 timeZone 进行 UTC 偏移计算，支持跨时区正确显示时间。

---

### 亮点 7：OpenSpec 变更管理流程（★★★★★ 工程化亮点）

**独特之处：** 项目引入了类 RFC 的技术变更文档规范（`openspec/changes/`），每个功能变更包含：

```
openspec/changes/<change-name>/
  ├── proposal.md   # Why + What Changes + Impact 分析
  ├── design.md     # 详细设计方案
  ├── tasks.md      # 拆分的可执行任务列表
  └── specs/        # 功能规格说明
```

**价值：**

- AI 辅助研发：proposal 由 AI 协作生成，tasks 由 AI 逐步实现
- 变更可追溯：每个功能点的决策背景和影响范围有文档记录
- 团队协作：新成员可快速理解历史变更的来龙去脉

---

### 亮点 8：ECharts 按需导入 + 地图动态加载（★★★）

```typescript
// 按需注册 ECharts 组件（减少打包体积）
echarts.use([TitleComponent, TooltipComponent, GeoComponent, MapChart, CanvasRenderer]);

// 地图 JSON 延迟加载 + Ref 缓存（避免重复网络请求）
if (_.isEmpty(mapJsonRef.current[mapScope])) {
  mapJsonRef.current[mapScope] = await getMapJson(); // CDN 动态 fetch
}

// 监听侧边栏折叠触发 resize（保证图表自适应布局）
useEffect(() => { handleResize(); }, [collapsed]);
```

---

### 亮点 9：双构建工具链（★★★）

| 场景 | 工具 | 特点 |
|------|------|------|
| 本地开发 | Vite | 极速 HMR，毫秒级热更新 |
| 生产构建 | @td/webpack-builder-react-xd | 内部定制，支持多环境（dev/staging/prod）、多 bundle（td）构建 |

**CDN 版本化路径：**

```
https://portal-static.tongdun.cn/static-public/{name}/base/{version}/
```

版本号变更即实现增量发布，不影响旧版本 CDN 缓存。

---

## 三、项目难点

### 难点 1：多租户 + 多版本状态一致性

**问题描述：**

- 系统支持多个合作方（partnerCode）切换，每次切换需要重新拉取菜单
- EditionMap 按产品路径分别维护，需要保证切换合作方时各产品版本正确重置
- localStorage 版本缓存可能与后端最新菜单版本不一致（如产品升级/降级）

**解决方案：** `initCurProductEditionMap` 在菜单加载后主动校验 localStorage 中版本的合法性，不合法则降级。

**潜在风险：** 代码中有注释 `//谁有空谁优化` 说明该逻辑存在技术债，属于紧急上线的临时实现。

---

### 难点 2：异步路由初始化期间的 Loading 状态管理

**问题描述：**

```
页面加载 → Auth 组件 mount → 异步 fetchMenus()
→ loading=true 期间渲染全屏 Loading
→ fetchMenus 完成 → 动态路由生效 → 渲染业务页面
```

**难点：**

- `/aws/*` 路由需要跳过菜单请求（AWS 独立登录流程）
- 菜单请求失败时 `partnerData` 为空，需要重定向到 `/error`
- 路由动态化后，浏览器刷新需要确保路由树在渲染业务内容前就已经构建完毕

---

### 难点 3：跨模块穿透跳转的参数序列化

**问题描述：** `PenetrationSearch` 支持从一个业务模块跳转到另一个模块，同时携带搜索上下文。

```typescript
location.href = `${path}?searchParams=${encodeURIComponent(JSON.stringify(params))}`;
```

**难点：**

- 时间参数（moment 对象）需要序列化为时间戳再传递
- 目标页面的 `AdvancedSearch` 需要在 `getParamsFromUrlAndLocalStorage` 中解析 URL 参数并还原
- 跨版本的参数兼容性：源页面参数结构变更后，目标页面可能无法正确解析历史 URL

---

### 难点 4：数据脱敏的展示层架构

**设计决策：** 脱敏发生在展示层（render 函数），而非数据层（接口返回原始数据）

```typescript
// store 中按路径维护脱敏状态
oneClickDesensitization: {
  '/trusttransaction/list/all': false,
  '/trusttransaction/list/log': false,
}
// localStorage 持久化，刷新不丢失
```

**难点：**

- 所有涉及敏感字段（手机号、邮箱、IP 等）的表格列 render 函数都需要接入该状态
- 跨组件状态同步：表格列的 render 是纯函数，需要在渲染时读取最新的脱敏状态
- 不影响复制到剪贴板的原始值（脱敏只影响显示，不影响数据操作）

---

### 难点 5：AI 规则批量应用的并发状态管理

**难点：**

- LLM 流式响应期间需要禁用输入框（防止并发请求）
- 多规则 Checkbox 状态 + 配额计算 + feedback 状态（like/unlike/copied/loading）各自独立管理
- `buildPolicyConditions` 的同名规则自动编号需要保证幂等（相同输入始终相同输出）

```typescript
// 同名规则追加序号的计数器实现
const nameCount: Record<string, number> = {};
return rules.map((rule) => {
  const count = nameCount[baseName] || 0;
  nameCount[baseName] = count + 1;
  const name = count > 0 ? `${baseName}${count}` : baseName;
  // ...
});
```

---

### 难点 6：图谱时区处理与状态同步

**难点：**

- 时区从 Cookie（`timeZone`）或 `moment().utcOffset()` 获取，需要在 store 初始化时（非组件环境）计算
- 图谱节点的时间范围查询需要与全局时区保持一致
- 图谱视图（view）和列表视图（list）共用同一套 `searchParams`，切换时需要保持参数同步

---

## 四、面试官建议的追问方向

| 问题 | 考察重点 |
|------|----------|
| `createService` 中为什么用 `Reflect.set` 而不是直接赋值？ | Proxy/Reflect API 语义理解 |
| 401 单例 Modal 如何防止内存泄漏？`modalInstance` 何时置空？ | 模态框生命周期管理 |
| `initCurProductEditionMap` 里的 `// 谁有空谁优化` 有什么问题？你会怎么重构？ | 代码评审与重构能力 |
| Vite 开发和 Webpack 生产构建行为不一致时如何排查？ | 构建工具深度理解 |
| OpenSpec 变更管理流程是怎么运转的？AI 如何参与实现？ | 团队协作与 AI 辅助开发经验 |
| `PenetrationSearch` 的跨模块跳转方案有什么缺点？有无更好的实现？ | 架构设计能力 |
| 为什么不使用 React Query / SWR，而是选择 ahooks 的 useRequest？ | 技术选型决策能力 |

---

## 五、综合评分（面试官视角）

| 维度 | 评分 | 说明 |
|------|------|------|
| 业务复杂度 | ★★★★★ | 11个产品线，多租户，版本体系，风控专业领域 |
| 工程化水平 | ★★★★☆ | OpenSpec+Husky+双构建，有亮点；存在少量技术债 |
| 技术深度 | ★★★★☆ | 动态路由、拦截器、图谱可视化均有深度实现 |
| AI 能力整合 | ★★★★★ | LLM 与业务深度集成，不是简单 chatbot |
| 代码规范 | ★★★☆☆ | 有注释式技术债（// 谁有空谁优化），部分逻辑较复杂 |
| 组件化程度 | ★★★★☆ | xdad 组件库体系完善，复用性强 |

---

## 六、总结

这是一个**业务复杂度高、工程化规范完善**的企业级 SaaS 项目。

**最大亮点（面试重点展开）：**

1. **AI 规则助手**与风控业务的深度集成——体现了 AI Native 产品设计能力
2. **OpenSpec 驱动的 AI 辅助研发流程**——体现了团队对 AI 工程化的探索
3. **动态路由 + 三层版本权限体系**——体现了对复杂权限系统的架构能力

**面试建议：**
结合版本权限体系和动态路由架构展开讲解，重点突出 AI 规则助手的数据闭环设计（`aiRuleUuid` → 采纳率追踪 → LLM 优化），能充分体现候选人对**复杂前端工程的驾驭能力**以及**AI 与业务深度融合的工程实践**。

---

*报告生成时间：2026年4月22日*
