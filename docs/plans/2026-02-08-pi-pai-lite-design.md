# pi-pai-lite — Design Document

**Date:** 2026-02-08
**Status:** Draft
**Origin:** Adapted from [danielmiessler/Personal_AI_Infrastructure](https://github.com/danielmiessler/Personal_AI_Infrastructure)

---

## What This Is

A lightweight pi extension that brings PAI's structured thinking modes and lightweight memory to pi. No voice, no hooks, no elaborate formatting, no life OS. Just the thinking engine and a place to remember things.

Inspired by PAI's Algorithm, Council, Red Team, BeCreative, and First Principles systems — distilled to their essentials and delivered as a single pi extension with a companion skill.

## What We Keep From PAI

| PAI Feature | What We Take | What We Drop |
|---|---|---|
| The Algorithm (7-phase execution) | Effort sensing, success criteria | ISC tables, LCARS display, phase tools |
| Council (multi-perspective debate) | Structured multi-viewpoint analysis prompt | Multi-agent dispatch, 4+ spawned agents |
| Red Team (adversarial analysis) | Attack vector / failure mode prompt scaffold | 32-agent adversarial swarm |
| First Principles | Assumption-challenging prompt scaffold | — |
| BeCreative | Lateral thinking / divergent prompt scaffold | — |
| Memory System | 3 small files, on-demand loading | JSONL logs, session harvesting, signals, WORK/ dirs |
| Telos | Nothing | All of it |
| Skill System | 1 minimal skill | 23 packs, SYSTEM/USER tiers, TitleCase conventions |
| Hook System | Nothing | All of it |
| Agent System | Nothing (for now) | Agent personas, traits, AgentFactory |
| Voice System | Nothing | All of it |
| Response Format | Nothing | Emoji sections, story explanations, voice lines |
| Observability | Nothing | Dashboard, event streaming |

## Architecture

```
Extension (index.ts)
  ├── registers 2 tools: think, memory
  ├── registers 6 commands: /pai, /council, /redteam, /firstprinciples, /creative, /pai memory
  ├── sets status line: "PAI: on" / "PAI: thinking (council)..."
  └── manages on/off state

Skill (skill/SKILL.md)
  └── ~30 lines, loaded on demand
  └── tells the LLM what think/memory tools are for and when to use them

Memory Files (~/.pi/pai/)
  ├── preferences.md    # tech stack, coding style, how you like things
  ├── learnings.md      # things discovered during work (append-only)
  └── context.md        # current projects, goals, focus areas
```

### Key Design Decisions

1. **One `think` tool, not four.** The LLM calls `think` with a problem. The tool routes to the right mode internally (or the user forces a mode via commands). Simpler surface area for the LLM.

2. **Scaffold, not inference.** The thinking tools return structured prompt scaffolds as tool results. The calling LLM reasons through them itself. Zero extra API calls, zero latency, zero cost. Upgrade path to real sub-agents exists but isn't needed yet.

3. **Memory on demand, not in system prompt.** Memory files are only read when the `think` or `memory` tool is called. Simple tasks get zero context overhead. Memory enters the conversation only when structured thinking happens.

4. **Fully toggleable.** `/pai` turns the whole extension on or off. When off: tools deregistered, skill removed, status cleared. Completely invisible.

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

When `mode` is `"auto"` or omitted, the tool picks the mode via simple pattern matching:
- Trade-offs, decisions, "should I" → council
- Security, risk, failure, "what could go wrong" → red_team
- "Why", assumptions, fundamentals → first_principles
- Stuck, novel, lateral, "what if" → be_creative

### Internal Modes

Each mode is a function that constructs a structured prompt scaffold.

**council(problem, context?)**
Forces multi-perspective analysis:
- Perspective 1: The pragmatist (ship it, what's fastest)
- Perspective 2: The architect (what's the right abstraction)
- Perspective 3: The skeptic (what's wrong with all of these)
- Perspective 4: The user advocate (what does the end user actually need)
- Agreements and disagreements across perspectives
- Synthesized recommendation

**red_team(problem, context?)**
Forces adversarial thinking:
- Attack vectors / failure modes (at least 5)
- Severity and likelihood for each
- What's the worst case if this fails?
- Mitigations for each identified risk
- Overall risk assessment

**first_principles(problem, context?)**
Forces assumption challenging:
- What assumptions are we making? (list them)
- Which of these are actually true vs. inherited/conventional?
- What are the base truths we can build from?
- Rebuilt reasoning from base truths
- How does this change our approach?

**be_creative(problem, context?)**
Forces divergent thinking:
- What if we inverted the problem?
- What adjacent domains solve something similar?
- What's the most unconventional approach?
- What constraints are we assuming that could be removed?
- 3 novel approaches with trade-offs

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
Cleared when done.

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

- **read**: Returns the contents of the specified file. If file doesn't exist, returns empty string and a note that the file hasn't been created yet.
- **append**: Appends content to the file with a timestamp separator. Creates the file if it doesn't exist.
- **replace**: Replaces the entire file contents. Mainly for preferences and context which get rewritten rather than appended.

The `think` tool internally reads memory files when called — the LLM doesn't need to call `memory` then `think` separately.

---

## Commands

| Command | Action |
|---|---|
| `/pai` | Toggle PAI on/off. Shows current state. |
| `/council "question"` | Calls `think` with mode forced to `council` |
| `/redteam "question"` | Calls `think` with mode forced to `red_team` |
| `/firstprinciples "question"` | Calls `think` with mode forced to `first_principles` |
| `/creative "question"` | Calls `think` with mode forced to `be_creative` |
| `/pai memory` | Show summary of all memory files |

Commands that take a question inject it as a user message with the forced mode, so the LLM processes the result naturally.

---

## The Skill (SKILL.md)

Minimal. ~30 lines. Auto-discovered from the extension directory.

```markdown
---
name: pai
description: Structured thinking for complex problems. Available modes:
  council (multi-perspective), red_team (adversarial), first_principles
  (assumption challenging), be_creative (lateral thinking).
---

# PAI Lite — Structured Thinking

You have access to a `think` tool for complex problems. Use it when:
- Making architectural decisions or trade-offs
- Reviewing security, risk, or failure modes
- Questioning assumptions or conventional approaches
- Stuck and need novel/lateral approaches

Don't use it for simple tasks — just do those directly.

The tool handles mode selection automatically, or you can specify a mode.

You also have a `memory` tool for reading/writing persistent context
(preferences, learnings, active projects). The think tool reads memory
automatically — you don't need to load it first.
```

That's it. The skill is just a hint. The TypeScript does the work.

---

## File Structure

```
~/.pi/agent/extensions/pi-pai-lite/
├── package.json
├── index.ts                  # Extension entry: registers tools, commands, toggle
├── skill/
│   └── SKILL.md              # Minimal skill for LLM guidance
├── src/
│   ├── think.ts              # think tool: routing + mode implementations
│   ├── memory.ts             # memory tool: read/append/replace
│   ├── modes/
│   │   ├── council.ts        # Council prompt scaffold
│   │   ├── red-team.ts       # Red team prompt scaffold
│   │   ├── first-principles.ts  # First principles prompt scaffold
│   │   └── be-creative.ts    # BeCreative prompt scaffold
│   └── router.ts             # Auto-mode selection logic
└── README.md

~/.pi/pai/                    # User data (created on first use)
├── preferences.md
├── learnings.md
└── context.md
```

---

## Toggle Behavior

### PAI On (default)
- `think` and `memory` tools registered and available to LLM
- Skill discoverable
- Status shows "PAI: on"

### PAI Off (`/pai` to toggle)
- Tools deregistered — LLM cannot call them
- Skill not loaded
- Status cleared
- Commands still work (so you can `/pai` to turn it back on)
- Zero footprint in LLM context

State persists across sessions via `pi.appendEntry()`.

---

## Phase 2 (Future)

Not in scope now, but designed for:

- **Widgets** — Show active thinking mode, success criteria, memory summary above editor
- **Custom rendering** — `renderCall`/`renderResult` on think tool for pretty formatted output
- **Heavy thinking** — Dispatch real sub-agents for council/red_team via `interactive_shell`
- **Memory compaction** — Auto-summarize learnings.md when it gets too large
- **`/pai status`** — Dashboard command showing memory summary, recent learnings, usage stats
