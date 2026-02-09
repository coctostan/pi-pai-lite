# pi-pai-lite — Design Document

**Date:** 2026-02-08
**Status:** Draft (revised post-review)
**Origin:** Adapted from [danielmiessler/Personal_AI_Infrastructure](https://github.com/danielmiessler/Personal_AI_Infrastructure)

---

## What This Is

A lightweight pi extension that brings PAI's structured thinking modes and lightweight memory to pi. No voice, no hooks, no elaborate formatting, no life OS. Just the thinking engine and a place to remember things.

Inspired by PAI's Algorithm, Council, Red Team, BeCreative, and First Principles systems — distilled to their essentials and delivered as a single pi extension.

## What We Keep From PAI

| PAI Feature | What We Take | What We Drop |
|---|---|---|
| The Algorithm (7-phase execution) | Effort sensing, success criteria | ISC tables, LCARS display, phase tools |
| Council (multi-perspective debate) | Structured multi-viewpoint analysis prompt | Multi-agent dispatch, 4+ spawned agents |
| Red Team (adversarial analysis) | Failure mode prompt scaffold | 32-agent adversarial swarm, severity/likelihood scoring |
| First Principles | Assumption-challenging prompt scaffold | — |
| BeCreative | Lateral thinking / divergent prompt scaffold | — |
| Memory System | 3 small files, on-demand loading | JSONL logs, session harvesting, signals, WORK/ dirs |
| Telos | Nothing | All of it |
| Skill System | Nothing (tool descriptions are enough) | All of it |
| Hook System | Nothing | All of it |
| Agent System | Nothing (for now) | Agent personas, traits, AgentFactory |
| Voice System | Nothing | All of it |
| Response Format | Nothing | Emoji sections, story explanations, voice lines |
| Observability | Nothing | Dashboard, event streaming |

## Architecture

```
Extension (index.ts)
  ├── registers 2 tools: think, memory
  ├── registers 5 commands: /council, /redteam, /firstprinciples, /creative, /pai
  ├── sets status line while thinking: "PAI: thinking (council)..."
  └── creates ~/.pi/pai/ on first use

Memory Files (~/.pi/pai/)
  ├── preferences.md    # tech stack, coding style, how you like things
  ├── learnings.md      # things discovered during work (append-only)
  └── context.md        # current projects, goals, focus areas
```

### Key Design Decisions

1. **One `think` tool, not four.** The LLM calls `think` with a problem. The tool routes to the right mode internally (or the user forces a mode via commands). Simpler surface area for the LLM.

2. **Scaffold, not inference.** The thinking tools return structured prompt scaffolds as tool results. The calling LLM reasons through them itself. Zero extra API calls, zero latency, zero cost. Upgrade path to real sub-agents exists but isn't needed yet.

3. **Memory on demand, not in system prompt.** Memory files are only read when the `think` or `memory` tool is called. Simple tasks get zero context overhead.

4. **No skill, no toggle.** Tool descriptions on `registerTool()` tell the LLM what the tools do. No separate SKILL.md needed. Tools are always registered but only invoked when explicitly called — they add a few lines to the tool list and nothing else during normal use. No toggle needed because there's no cost to having them present.

5. **Never fail.** The `think` tool degrades gracefully. If memory files are unreadable, think without memory and note it. If a mode function throws, return an error message as the tool result (`isError: true`), never crash the extension.

---

## The `think` Tool

### Input

```typescript
{
  problem: string,           // What needs thinking about
  mode?: "council" | "red_team" | "first_principles" | "be_creative" | "auto",
  context?: string           // Additional context if needed
}
```

When `mode` is `"auto"` or omitted, the tool picks the mode via conservative keyword matching:
- "attack", "vulnerability", "security risk", "exploit" → red_team
- "why do we", "assumptions", "fundamentals", "from scratch" → first_principles
- "stuck", "novel", "lateral", "what if we", "unconventional" → be_creative
- **Everything else → council** (safest default, includes a skeptic perspective)

The router is deliberately conservative. Narrow triggers, council as fallback. Misclassification toward council is harmless; misclassification away from it is confusing.

### Internal Modes

Each mode is a function that constructs a structured prompt scaffold.

**council(problem, context?)**
Forces multi-perspective analysis:
- Perspective 1: The pragmatist (ship it, what's fastest)
- Perspective 2: The architect (what's the right abstraction)
- Perspective 3: The skeptic (what's wrong with all of these — must name at least one deal-breaker, not just mild caveats)
- Perspective 4: The user advocate (what does the end user actually need)
- Explicit disagreements across perspectives (where do they conflict?)
- Synthesized recommendation

**red_team(problem, context?)**
Forces structured failure analysis (not adversarial — single-model scaffold can't truly self-adversarialize):
- Failure modes / attack vectors (at least 5)
- What's the worst case if each fails?
- At least one deal-breaker scenario that would block shipping
- Mitigations for each identified risk
- Overall risk assessment narrative

**first_principles(problem, context?)**
Forces assumption challenging:
- What assumptions are we making? (list them explicitly)
- Which of these are actually true vs. inherited/conventional? (must invalidate at least one)
- What are the base truths we can build from?
- Rebuilt reasoning from base truths only
- How does this change our approach?

**be_creative(problem, context?)**
Forces divergent thinking:
- What if we inverted the problem?
- What adjacent domains solve something similar?
- What's the most unconventional approach?
- What constraints are we assuming that could be removed?
- 3 novel approaches with concrete trade-offs (not just "brainstorm 3 ideas")

### Output

Every mode returns structured text with clear sections. Every response ends with:

```
## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

3-5 bullets defining what "done" looks like. This is PAI's ISC distilled to its minimum.

### Status Updates

While thinking, the tool updates the status line:
```
ctx.ui.setStatus("pai", "PAI: thinking (council)...")
```
Cleared when done. In non-interactive mode (`ctx.hasUI === false`), status updates are no-ops — the extension must not rely on them for correctness.

### Error Handling

- If memory files are unreadable (missing dir, bad encoding, permissions): think without memory, include a note in the output: `[Note: could not read memory files — proceeding without context]`
- If a mode function throws: return `{ isError: true }` with the error message as tool result. Never crash the extension.
- If memory content is binary/invalid UTF-8: skip it, note it, continue.

---

## The `memory` Tool

### Input

```typescript
{
  action: "read" | "append" | "replace",
  file: "preferences" | "learnings" | "context",
  content?: string  // required for append/replace
}
```

### Behavior

- **read**: Returns the contents of the specified file. If file doesn't exist, returns empty string and a note that the file hasn't been created yet. **Truncated to last 4KB** if larger, with `[truncated — showing last 4KB of ~/.pi/pai/{file}.md]` prepended.
- **append**: Appends content to the file with a timestamp separator. Creates `~/.pi/pai/` directory and file if they don't exist.
- **replace**: Replaces the entire file contents. Mainly for preferences and context which get rewritten rather than appended.

The `think` tool internally reads memory files when called — the LLM doesn't need to call `memory` then `think` separately. Memory embedded in `think` output follows the same 4KB-per-file truncation.

### File Safety

- `file` parameter is strictly enumerated (`"preferences" | "learnings" | "context"`). No user-controlled paths.
- Writes use `O_APPEND` semantics where applicable for atomic appends.
- Read errors return `isError: true` with a message, never throw.

---

## Commands

| Command | Action |
|---|---|
| `/council "question"` | Calls `think` with mode forced to `council` |
| `/redteam "question"` | Calls `think` with mode forced to `red_team` |
| `/firstprinciples "question"` | Calls `think` with mode forced to `first_principles` |
| `/creative "question"` | Calls `think` with mode forced to `be_creative` |
| `/pai [subcommand]` | `/pai memory` — show summary of all memory files. `/pai` alone — show brief help. |

Commands that take a question inject it as a user message with the forced mode, so the LLM processes the result naturally.

Note: `/pai memory` is implemented as the `/pai` command with args parsing (`args === "memory"`), since `pi.registerCommand()` registers a single command token.

---

## File Structure

```
~/.pi/agent/extensions/pi-pai-lite/
├── package.json
├── index.ts                  # Extension entry: registers tools and commands
├── src/
│   ├── think.ts              # think tool: routing + mode implementations
│   ├── memory.ts             # memory tool: read/append/replace + truncation
│   ├── modes/
│   │   ├── council.ts        # Council prompt scaffold
│   │   ├── red-team.ts       # Red team prompt scaffold
│   │   ├── first-principles.ts  # First principles prompt scaffold
│   │   └── be-creative.ts    # BeCreative prompt scaffold
│   └── router.ts             # Auto-mode selection logic (conservative keyword matching)
└── README.md

~/.pi/pai/                    # User data (created on first use)
├── preferences.md
├── learnings.md
└── context.md
```

---

## Phase 2 (Future)

Not in scope now, but designed for:

- **Widgets** — Show active thinking mode, success criteria, memory summary above editor
- **Custom rendering** — `renderCall`/`renderResult` on think tool for pretty formatted output
- **Heavy thinking** — Dispatch real sub-agents for council/red_team via `interactive_shell`
- **Memory compaction** — Auto-summarize learnings.md when it gets too large
- **`/pai status`** — Dashboard command showing memory summary, recent learnings, usage stats
- **Skill** — If tool descriptions prove insufficient for guiding LLM usage, add a proper skill via pi package distribution
