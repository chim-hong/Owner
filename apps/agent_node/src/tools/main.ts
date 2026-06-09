import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { tool } from "@langchain/core/tools";
import { z } from "zod";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.resolve(currentDir, "../docs");

const projectDocMap: Record<string, string> = {
  "trustdecision-portal": "trustDecision_portal.md"
};

const projectDetailInputSchema = z.object({
  project_name: z.enum(["trustdecision-portal", "trustdecision-oper", "aicube", "td-ui"]).nullable()
});

export const getProjectDetail = tool(
  async ({ project_name }) => {
    if (!project_name) {
      return { success: false, content: "项目名称为空，无法读取项目文档。" };
    }

    const filename = projectDocMap[project_name];
    if (!filename) {
      return { success: false, content: `项目 ${project_name} 暂未配置对应的 Markdown 文档。` };
    }

    try {
      const content = await readFile(path.join(docsDir, filename), "utf-8");
      return { success: true, content };
    } catch {
      return { success: false, content: `项目 ${project_name} 的文档文件不存在：${filename}。` };
    }
  },
  {
    name: "get_project_detail",
    description: "用于查询项目的具体情况",
    schema: projectDetailInputSchema
  }
);

export const getContact = tool(
  async () => ({ success: true, content: "123@tongdun.net" }),
  {
    name: "get_contact",
    description: "用于获取联系方式",
    schema: z.object({})
  }
);
