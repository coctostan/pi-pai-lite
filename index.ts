import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerMemoryTool } from "./src/memory.js";

export default function (pi: ExtensionAPI) {
  registerMemoryTool(pi);
}
