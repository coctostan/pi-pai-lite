import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerMemoryTool, readMemoryFile } from "./src/memory.js";
import { registerThinkTool } from "./src/think.js";

export default function (pi: ExtensionAPI) {
  registerMemoryTool(pi);
  registerThinkTool(pi);

  // Mode commands: inject a user message with forced mode
  const modeCommands: Array<{
    name: string;
    mode: string;
    description: string;
  }> = [
    { name: "council", mode: "council", description: "Multi-perspective analysis" },
    { name: "redteam", mode: "red_team", description: "Failure/risk analysis" },
    { name: "firstprinciples", mode: "first_principles", description: "Challenge assumptions" },
    { name: "creative", mode: "be_creative", description: "Lateral/divergent thinking" },
  ];

  for (const cmd of modeCommands) {
    pi.registerCommand(cmd.name, {
      description: cmd.description,
      handler: async (args, ctx) => {
        if (!args.trim()) {
          ctx.ui.notify(`Usage: /${cmd.name} <question>`, "warning");
          return;
        }
        pi.sendUserMessage(
          `Use the think tool with mode="${cmd.mode}" to analyze: ${args.trim()}`
        );
      },
    });
  }

  // /pai command with subcommands
  pi.registerCommand("pai", {
    description: "PAI utilities. Usage: /pai memory",
    handler: async (args, ctx) => {
      const sub = args.trim().toLowerCase();

      if (sub === "memory") {
        const prefs = readMemoryFile("preferences");
        const learnings = readMemoryFile("learnings");
        const context = readMemoryFile("context");

        const lines: string[] = ["PAI Memory Summary:", ""];

        lines.push(`preferences.md: ${prefs ? `${prefs.length} chars` : "(empty)"}`);
        lines.push(`learnings.md: ${learnings ? `${learnings.length} chars` : "(empty)"}`);
        lines.push(`context.md: ${context ? `${context.length} chars` : "(empty)"}`);

        ctx.ui.notify(lines.join("\n"), "info");
        return;
      }

      // Default: show help
      ctx.ui.notify(
        "PAI Lite — Structured Thinking\n\n" +
          "Commands:\n" +
          "  /council <question>         Multi-perspective analysis\n" +
          "  /redteam <question>         Failure/risk analysis\n" +
          "  /firstprinciples <question> Challenge assumptions\n" +
          "  /creative <question>        Lateral thinking\n" +
          "  /pai memory                 Show memory summary\n\n" +
          "The LLM can also call the think and memory tools directly.",
        "info"
      );
    },
  });
}
