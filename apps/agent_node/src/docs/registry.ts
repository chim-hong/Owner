import type { Project } from "../schema.js";

export const PROJECTS: Project[] = [
  {
    key: "trustdecision-portal",
    name: "TrustDecision客户平台",
    description: "一个风控类型的客户平台，用于客户管理数据"
  },
  {
    key: "trustdecision-oper",
    name: "TrustDecision运营平台",
    description: "一个风控类型的运营平台，用于运营管理数据和操作"
  },
  {
    key: "aicube",
    name: "AiCube规则智能助手",
    description: "客户通过自然语言提交规则配置需求，智能助手通过分析后，返回可配置的规则列表"
  }
];
