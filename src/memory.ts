import * as fs from "node:fs";
import * as path from "node:path";
import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const MEMORY_DIR = path.join(process.env.HOME ?? "~", ".pi", "pai");

const MEMORY_FILES = {
  preferences: "preferences.md",
  learnings: "learnings.md",
  context: "context.md",
} as const;

const MAX_READ_BYTES = 4096; // 4KB truncation limit

function ensureDir() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

function filePath(file: keyof typeof MEMORY_FILES): string {
  return path.join(MEMORY_DIR, MEMORY_FILES[file]);
}

export function readMemoryFile(file: keyof typeof MEMORY_FILES): string {
  const fp = filePath(file);
  try {
    if (!fs.existsSync(fp)) {
      return "";
    }
    const content = fs.readFileSync(fp, "utf-8");
    if (content.length > MAX_READ_BYTES) {
      const truncated = content.slice(-MAX_READ_BYTES);
      return `[truncated — showing last 4KB of ${fp}]\n\n${truncated}`;
    }
    return content;
  } catch {
    return "";
  }
}

export function readAllMemory(): string {
  const parts: string[] = [];
  for (const file of Object.keys(MEMORY_FILES) as Array<keyof typeof MEMORY_FILES>) {
    const content = readMemoryFile(file);
    if (content) {
      parts.push(`## ${file}\n\n${content}`);
    }
  }
  return parts.length > 0 ? parts.join("\n\n---\n\n") : "";
}

export function registerMemoryTool(pi: ExtensionAPI) {
  pi.registerTool({
    name: "memory",
    label: "Memory",
    description:
      "Read or write persistent memory files. Three files: preferences (tech stack, coding style), learnings (discoveries, append-only), context (current projects, goals). Use 'read' to check what's stored, 'append' to add to a file, 'replace' to rewrite a file.",
    parameters: Type.Object({
      action: StringEnum(["read", "append", "replace"] as const, {
        description: "read: get file contents. append: add to file. replace: overwrite file.",
      }),
      file: StringEnum(["preferences", "learnings", "context"] as const, {
        description: "Which memory file to access.",
      }),
      content: Type.Optional(
        Type.String({ description: "Content to write. Required for append and replace." })
      ),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const { action, file, content } = params as {
        action: "read" | "append" | "replace";
        file: "preferences" | "learnings" | "context";
        content?: string;
      };

      try {
        ensureDir();

        switch (action) {
          case "read": {
            const data = readMemoryFile(file);
            if (!data) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Memory file '${file}' is empty or hasn't been created yet. Use append or replace to add content.`,
                  },
                ],
              };
            }
            return { content: [{ type: "text" as const, text: data }] };
          }

          case "append": {
            if (!content) {
              return {
                content: [{ type: "text" as const, text: "Error: content is required for append." }],
                isError: true,
              };
            }
            const fp = filePath(file);
            const timestamp = new Date().toISOString();
            const entry = `\n\n---\n_${timestamp}_\n\n${content}`;
            fs.appendFileSync(fp, entry, "utf-8");
            return {
              content: [{ type: "text" as const, text: `Appended to ${file}.` }],
            };
          }

          case "replace": {
            if (!content) {
              return {
                content: [{ type: "text" as const, text: "Error: content is required for replace." }],
                isError: true,
              };
            }
            const fp = filePath(file);
            fs.writeFileSync(fp, content, "utf-8");
            return {
              content: [{ type: "text" as const, text: `Replaced contents of ${file}.` }],
            };
          }
        }
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Memory error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  });
}
