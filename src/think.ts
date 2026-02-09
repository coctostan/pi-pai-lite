import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readAllMemory } from "./memory.js";
import { autoSelectMode, type ThinkMode } from "./router.js";
import { councilScaffold } from "./modes/council.js";
import { redTeamScaffold } from "./modes/red-team.js";
import { firstPrinciplesScaffold } from "./modes/first-principles.js";
import { beCreativeScaffold } from "./modes/be-creative.js";

const MODE_LABELS: Record<ThinkMode, string> = {
  council: "council",
  red_team: "red team",
  first_principles: "first principles",
  be_creative: "creative",
};

function buildScaffold(mode: ThinkMode, problem: string, context?: string, memory?: string): string {
  switch (mode) {
    case "council":
      return councilScaffold(problem, context, memory);
    case "red_team":
      return redTeamScaffold(problem, context, memory);
    case "first_principles":
      return firstPrinciplesScaffold(problem, context, memory);
    case "be_creative":
      return beCreativeScaffold(problem, context, memory);
  }
}

export function registerThinkTool(pi: ExtensionAPI) {
  pi.registerTool({
    name: "think",
    label: "Think",
    description:
      "Structured thinking for complex problems. Modes: council (multi-perspective debate), red_team (failure analysis), first_principles (assumption challenging), be_creative (lateral thinking). Omit mode for auto-selection. Use for architectural decisions, risk assessment, assumption questioning, or when stuck. Don't use for simple tasks.",
    parameters: Type.Object({
      problem: Type.String({ description: "What needs thinking about." }),
      mode: Type.Optional(
        StringEnum(
          ["council", "red_team", "first_principles", "be_creative", "auto"] as const,
          { description: "Thinking mode. Omit or 'auto' for automatic selection." }
        )
      ),
      context: Type.Optional(
        Type.String({ description: "Additional context if needed." })
      ),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const { problem, context } = params as {
        problem: string;
        mode?: "council" | "red_team" | "first_principles" | "be_creative" | "auto";
        context?: string;
      };

      try {
        // Select mode
        const mode: ThinkMode =
          params.mode && params.mode !== "auto"
            ? (params.mode as ThinkMode)
            : autoSelectMode(problem);

        // Status update
        if (ctx.hasUI) {
          ctx.ui.setStatus("pai", `PAI: thinking (${MODE_LABELS[mode]})...`);
        }

        // Read memory (graceful degradation)
        let memory = "";
        try {
          memory = readAllMemory();
        } catch {
          // Continue without memory
        }

        // Build scaffold
        const scaffold = buildScaffold(
          mode,
          problem,
          context,
          memory || undefined
        );

        const memoryNote = memory
          ? ""
          : "\n\n[Note: no memory files found — proceeding without stored context]";

        // Clear status
        if (ctx.hasUI) {
          ctx.ui.setStatus("pai", undefined);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: scaffold + memoryNote,
            },
          ],
          details: { mode },
        };
      } catch (err) {
        // Clear status on error
        if (ctx.hasUI) {
          ctx.ui.setStatus("pai", undefined);
        }

        throw err instanceof Error ? err : new Error(String(err));
      }
    },
  });
}
