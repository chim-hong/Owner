import { getContact, getProjectDetail } from "./main.js";

export const TOOLS_REGISTRY = {
  get_project_detail: {
    name: "get_project_detail",
    description: "用于查询项目的具体情况",
    intent: "project",
    handler: getProjectDetail
  },
  get_contact: {
    name: "get_contact",
    description: "用于获取联系方式",
    intent: "contact",
    handler: getContact
  }
} as const;

export type ToolRegistryItem = (typeof TOOLS_REGISTRY)[keyof typeof TOOLS_REGISTRY];

export function getToolRegistry(name: string): ToolRegistryItem {
  const registry = Object.values(TOOLS_REGISTRY).find((item) => item.name === name);
  if (!registry) {
    throw new Error(`Unknown tool: ${name}`);
  }

  return registry;
}
