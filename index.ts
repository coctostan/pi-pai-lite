import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerMemoryTool } from "./src/memory.js";
import { registerThinkTool } from "./src/think.js";

export default function (pi: ExtensionAPI) {
  registerMemoryTool(pi);
  registerThinkTool(pi);
}
