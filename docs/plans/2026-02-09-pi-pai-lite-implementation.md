# pi-pai-lite Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Build a pi extension that provides structured thinking modes (council, red_team, first_principles, be_creative) and lightweight persistent memory (preferences, learnings, context).

**Architecture:** Single pi extension with two tools (`think`, `memory`), five commands (`/council`, `/redteam`, `/firstprinciples`, `/creative`, `/pai`), and a conservative auto-mode router. Memory stored as markdown files under `~/.pi/pai/`. No skill file, no toggle — tools register once and sit quietly until called.

**Tech Stack:** TypeScript, pi extension API (`@mariozechner/pi-coding-agent`), `@sinclair/typebox` + `@mariozechner/pi-ai` for schemas, `node:fs` + `node:path` for file I/O.

---

### Task 1: Scaffold the extension directory

**Files:**
- Create: `index.ts`
- Create: `src/memory.ts`
- Create: `src/think.ts`
- Create: `src/router.ts`
- Create: `src/modes/council.ts`
- Create: `src/modes/red-team.ts`
- Create: `src/modes/first-principles.ts`
- Create: `src/modes/be-creative.ts`

**Step 1: Create index.ts with minimal extension skeleton**

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // Tools and commands will be registered here
}
```

**Step 2: Create empty module stubs for all source files**

Create each file in `src/` with a placeholder export:

`src/memory.ts`:
```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export function registerMemoryTool(pi: ExtensionAPI) {
  // TODO
}
```

`src/think.ts`:
```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export function registerThinkTool(pi: ExtensionAPI) {
  // TODO
}
```

`src/router.ts`:
```typescript
export type ThinkMode = "council" | "red_team" | "first_principles" | "be_creative";

export function autoSelectMode(problem: string): ThinkMode {
  return "council";
}
```

`src/modes/council.ts`:
```typescript
export function councilScaffold(problem: string, context?: string, memory?: string): string {
  return `TODO: council scaffold for: ${problem}`;
}
```

`src/modes/red-team.ts`:
```typescript
export function redTeamScaffold(problem: string, context?: string, memory?: string): string {
  return `TODO: red team scaffold for: ${problem}`;
}
```

`src/modes/first-principles.ts`:
```typescript
export function firstPrinciplesScaffold(problem: string, context?: string, memory?: string): string {
  return `TODO: first principles scaffold for: ${problem}`;
}
```

`src/modes/be-creative.ts`:
```typescript
export function beCreativeScaffold(problem: string, context?: string, memory?: string): string {
  return `TODO: be creative scaffold for: ${problem}`;
}
```

**Step 3: Verify the extension loads**

Run: `pi -e ./index.ts -p "say hi"`
Expected: pi loads without errors, responds normally. The extension does nothing yet but loads cleanly.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: scaffold pi-pai-lite extension structure"
```

---

### Task 2: Implement the memory tool

**Files:**
- Modify: `src/memory.ts`
- Modify: `index.ts`

**Step 1: Implement src/memory.ts**

```typescript
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
```

**Step 2: Wire memory tool into index.ts**

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerMemoryTool } from "./src/memory.js";

export default function (pi: ExtensionAPI) {
  registerMemoryTool(pi);
}
```

**Step 3: Test the memory tool**

Run: `pi -e ./index.ts -p "Use the memory tool to append 'I prefer TypeScript and minimal dependencies' to preferences, then read it back."`
Expected: LLM calls memory tool with append, then read. Both succeed. File created at `~/.pi/pai/preferences.md`.

Verify: `cat ~/.pi/pai/preferences.md`
Expected: Contains the appended text with a timestamp separator.

**Step 4: Clean up test data**

```bash
rm -rf ~/.pi/pai
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement memory tool with read/append/replace and 4KB truncation"
```

---

### Task 3: Implement the auto-mode router

**Files:**
- Modify: `src/router.ts`

**Step 1: Implement conservative keyword matching**

```typescript
export type ThinkMode = "council" | "red_team" | "first_principles" | "be_creative";

const RED_TEAM_PATTERNS = [
  /\battack\b/i,
  /\bvulnerab/i,
  /\bsecurity\s+risk/i,
  /\bexploit/i,
  /\bthreat\b/i,
  /\bpenetrat/i,
];

const FIRST_PRINCIPLES_PATTERNS = [
  /\bwhy\s+do\s+we\b/i,
  /\bassumptions?\b/i,
  /\bfundamental/i,
  /\bfrom\s+scratch\b/i,
  /\bfirst\s+principles?\b/i,
];

const CREATIVE_PATTERNS = [
  /\bstuck\b/i,
  /\bnovel\b/i,
  /\blateral\b/i,
  /\bwhat\s+if\s+we\b/i,
  /\bunconventional/i,
  /\bwild\s+idea/i,
  /\bout\s+of\s+the\s+box/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function autoSelectMode(problem: string): ThinkMode {
  if (matchesAny(problem, RED_TEAM_PATTERNS)) return "red_team";
  if (matchesAny(problem, FIRST_PRINCIPLES_PATTERNS)) return "first_principles";
  if (matchesAny(problem, CREATIVE_PATTERNS)) return "be_creative";
  return "council";
}
```

**Step 2: Verify module compiles (quick sanity check)**

Run: `pi -e ./index.ts -p "say hi"`
Expected: Loads without errors.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: implement conservative auto-mode router with council as default"
```

---

### Task 4: Implement the four prompt scaffolds

**Files:**
- Modify: `src/modes/council.ts`
- Modify: `src/modes/red-team.ts`
- Modify: `src/modes/first-principles.ts`
- Modify: `src/modes/be-creative.ts`

**Step 1: Implement council.ts**

```typescript
export function councilScaffold(problem: string, context?: string, memory?: string): string {
  const sections: string[] = [];

  sections.push(`# Council Analysis\n\n**Problem:** ${problem}`);

  if (context) sections.push(`**Additional context:** ${context}`);
  if (memory) sections.push(`**From memory:**\n${memory}`);

  sections.push(`
## Instructions

Analyze this problem from four perspectives. Each perspective MUST take a distinct position — do not let them converge prematurely.

### Perspective 1: The Pragmatist
What's the fastest path to shipping? What's the simplest thing that works? What are we overcomplicating?

### Perspective 2: The Architect
What's the right abstraction? What will we regret in 6 months? Where does this fit in the bigger picture?

### Perspective 3: The Skeptic
What's wrong with all the above? Name at least one **deal-breaker** — a scenario where the proposed approaches fail badly, not just mild caveats. What are we not seeing?

### Perspective 4: The User Advocate
What does the end user actually need? Are we solving the right problem? What would a user complain about?

### Disagreements
Where do these perspectives conflict? Be specific — name the exact points of tension.

### Recommendation
Synthesize a recommendation that acknowledges the tensions. Don't pretend consensus exists if it doesn't.

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

Define 3-5 bullets for what "done" looks like.`);

  return sections.join("\n\n");
}
```

**Step 2: Implement red-team.ts**

```typescript
export function redTeamScaffold(problem: string, context?: string, memory?: string): string {
  const sections: string[] = [];

  sections.push(`# Failure Analysis\n\n**Problem:** ${problem}`);

  if (context) sections.push(`**Additional context:** ${context}`);
  if (memory) sections.push(`**From memory:**\n${memory}`);

  sections.push(`
## Instructions

Identify how this could fail. Be concrete and specific, not generic.

### Failure Modes
List at least 5 specific failure modes or attack vectors. For each:
- **What fails:** Describe the specific failure
- **Worst case:** What happens if this isn't caught?
- **Mitigation:** How to prevent or detect it

### Deal-Breaker
Identify at least one scenario that would **block shipping entirely** if it occurred. Not a minor inconvenience — a real blocker.

### Risk Assessment
Overall narrative: how risky is this? What's the one thing we must get right above all else?

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

Define 3-5 bullets for what "done" looks like.`);

  return sections.join("\n\n");
}
```

**Step 3: Implement first-principles.ts**

```typescript
export function firstPrinciplesScaffold(problem: string, context?: string, memory?: string): string {
  const sections: string[] = [];

  sections.push(`# First Principles Analysis\n\n**Problem:** ${problem}`);

  if (context) sections.push(`**Additional context:** ${context}`);
  if (memory) sections.push(`**From memory:**\n${memory}`);

  sections.push(`
## Instructions

Challenge assumptions. Rebuild from ground truth.

### Assumptions
List every assumption we're making about this problem. Include inherited assumptions (things we assume because that's how it's usually done).

### Assumption Audit
For each assumption, mark it:
- **TRUE** — verified, based on evidence
- **INHERITED** — convention or habit, not verified
- **FALSE** — actually wrong

You MUST invalidate at least one assumption. If you can't find one that's false, you haven't looked hard enough.

### Base Truths
What do we actually know for certain? Strip away everything inherited and conventional.

### Rebuilt Reasoning
Starting only from base truths, what approach emerges? How does it differ from the conventional approach?

### Impact
How does this change what we should do? Be specific about what changes and what stays the same.

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

Define 3-5 bullets for what "done" looks like.`);

  return sections.join("\n\n");
}
```

**Step 4: Implement be-creative.ts**

```typescript
export function beCreativeScaffold(problem: string, context?: string, memory?: string): string {
  const sections: string[] = [];

  sections.push(`# Creative / Lateral Thinking\n\n**Problem:** ${problem}`);

  if (context) sections.push(`**Additional context:** ${context}`);
  if (memory) sections.push(`**From memory:**\n${memory}`);

  sections.push(`
## Instructions

Think sideways. Break out of the default solution space.

### Inversion
What if we inverted the problem? Instead of solving X, what if we made X unnecessary? What if we optimized for the opposite of what seems obvious?

### Adjacent Domains
What other domains solve a similar problem? How do they approach it? Can we steal an approach from biology, game design, urban planning, logistics, or somewhere else unexpected?

### Constraint Removal
What constraints are we assuming that could be removed? What would we do if we had unlimited time? Zero users? A million users? No backward compatibility?

### Three Novel Approaches
Propose 3 approaches that are genuinely different from the obvious solution. For each:
- **The idea:** What is it, concretely?
- **Why it might work:** What's the upside?
- **Why it might not:** What's the risk?
- **What we'd learn:** Even if it fails, what would trying it teach us?

Do NOT produce three variations of the same idea. Each must attack the problem from a fundamentally different angle.

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

Define 3-5 bullets for what "done" looks like.`);

  return sections.join("\n\n");
}
```

**Step 5: Verify module compiles**

Run: `pi -e ./index.ts -p "say hi"`
Expected: Loads without errors.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: implement four prompt scaffolds (council, red-team, first-principles, be-creative)"
```

---

### Task 5: Implement the think tool

**Files:**
- Modify: `src/think.ts`
- Modify: `index.ts`

**Step 1: Implement src/think.ts**

```typescript
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

        return {
          content: [
            {
              type: "text" as const,
              text: `Think tool error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  });
}
```

**Step 2: Wire think tool into index.ts**

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerMemoryTool } from "./src/memory.js";
import { registerThinkTool } from "./src/think.js";

export default function (pi: ExtensionAPI) {
  registerMemoryTool(pi);
  registerThinkTool(pi);
}
```

**Step 3: Test the think tool**

Run: `pi -e ./index.ts -p "Use the think tool to analyze: should we use a monorepo or multi-repo for a team of 5 developers?"`
Expected: LLM calls think tool, gets council scaffold back (auto-routes to council), then reasons through the perspectives and provides a recommendation with success criteria.

**Step 4: Test explicit mode**

Run: `pi -e ./index.ts -p "Use the think tool with mode red_team to analyze: deploying a Node.js app to production without a staging environment"`
Expected: LLM calls think with mode=red_team, gets failure analysis scaffold.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement think tool with auto-routing, memory integration, and status updates"
```

---

### Task 6: Implement commands

**Files:**
- Modify: `index.ts`

**Step 1: Add all five commands to index.ts**

```typescript
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
```

Note: `readMemoryFile` must be exported from `src/memory.ts` — it already is in the Task 2 implementation.

**Step 2: Test /pai command**

Run: `pi -e ./index.ts` (interactive)
Type: `/pai`
Expected: Shows help text with all commands listed.

Type: `/pai memory`
Expected: Shows memory summary (all empty if no files exist).

**Step 3: Test a mode command**

Type: `/council Should we use REST or GraphQL for our new API?`
Expected: Injects a user message, LLM calls think tool with mode=council, reasons through council scaffold.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement /council, /redteam, /firstprinciples, /creative, and /pai commands"
```

---

### Task 7: End-to-end test and README

**Files:**
- Create: `README.md`

**Step 1: Run end-to-end tests**

Test 1 — Auto-routing to red_team:
Run: `pi -e ./index.ts -p "Use the think tool to analyze: what are the security vulnerabilities in accepting user-uploaded files?"`
Expected: Routes to red_team mode (keyword "vulnerabilities").

Test 2 — Memory round-trip:
Run: `pi -e ./index.ts -p "Use the memory tool to replace the preferences file with 'TypeScript, minimal deps, TDD'. Then use the think tool to analyze: should we add a database to this project?"`
Expected: Memory is written, think tool reads it back and includes it in the scaffold.

Test 3 — Creative mode via command:
Run: `pi -e ./index.ts` (interactive)
Type: `/creative How could we make code review less painful?`
Expected: LLM uses think tool with be_creative mode.

**Step 2: Write README.md**

```markdown
# pi-pai-lite

Structured thinking modes and lightweight memory for [pi](https://github.com/badlogic/pi-mono).

Inspired by [danielmiessler/Personal_AI_Infrastructure](https://github.com/danielmiessler/Personal_AI_Infrastructure), distilled to essentials.

## Install

Copy this directory to `~/.pi/agent/extensions/pi-pai-lite/`.

## What It Does

Two tools the LLM can call:

- **think** — Structured thinking with four modes:
  - `council` — Multi-perspective analysis (pragmatist, architect, skeptic, user advocate)
  - `red_team` — Failure mode analysis with deal-breakers
  - `first_principles` — Assumption challenging, rebuilt reasoning
  - `be_creative` — Lateral thinking, inversion, adjacent-domain inspiration

- **memory** — Persistent files under `~/.pi/pai/`:
  - `preferences.md` — Tech stack, coding style
  - `learnings.md` — Discoveries (append-only)
  - `context.md` — Current projects, goals

## Commands

| Command | What it does |
|---|---|
| `/council <question>` | Force council mode |
| `/redteam <question>` | Force red team mode |
| `/firstprinciples <question>` | Force first principles mode |
| `/creative <question>` | Force creative mode |
| `/pai` | Show help |
| `/pai memory` | Show memory file summary |

## Design

- **Scaffold, not inference.** Think tool returns structured prompts. The LLM reasons through them. Zero extra API calls.
- **Memory on demand.** Only loaded when think/memory tools are called. No system prompt overhead.
- **Conservative auto-routing.** Narrow keyword triggers; defaults to council.
- **Never fails.** Memory errors degrade gracefully. Think continues without memory if files are unreadable.
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add README and verify end-to-end behavior"
```

---

### Task 8: Install to extensions directory

**Step 1: Copy extension to pi extensions directory**

```bash
mkdir -p ~/.pi/agent/extensions/pi-pai-lite
cp -r index.ts src/ README.md ~/.pi/agent/extensions/pi-pai-lite/
```

**Step 2: Test with auto-discovery (no -e flag)**

Run: `pi` (interactive, new session)
Type: `/pai`
Expected: PAI help text appears, confirming auto-discovery works.

Type: `/council Should we refactor the auth module or rewrite it?`
Expected: Think tool fires with council mode.

**Step 3: Commit (tag as v1)**

```bash
git add -A
git commit -m "docs: installation instructions, v1 complete"
git tag v0.1.0
```
