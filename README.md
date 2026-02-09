# pi-pai-lite

Structured thinking modes and lightweight persistent memory for [pi](https://github.com/badlogic/pi-mono).

## Origin

This project is directly inspired by Daniel Miessler's [Personal AI Infrastructure (PAI)](https://github.com/danielmiessler/Personal_AI_Infrastructure) — an ambitious open-source platform built on the belief that *AI should magnify everyone, not just the top 1%*. PAI provides a full-featured personal AI system with multi-agent councils, adversarial red teams, a 7-phase execution algorithm, persistent memory, skill systems, voice, observability, and much more.

pi-pai-lite distills PAI's core thinking patterns into a single lightweight [pi extension](https://github.com/badlogic/pi-mono). No multi-agent swarms, no hooks, no voice, no dashboard. Just the structured thinking engine and a place to remember things — PAI's best ideas in their simplest possible form.

### What we kept from PAI

| PAI Concept | What pi-pai-lite takes | What it leaves behind |
|---|---|---|
| **Council** (multi-perspective debate) | Structured 4-perspective analysis prompt | Multi-agent dispatch, spawned agent personas |
| **Red Team** (adversarial analysis) | Failure mode prompt scaffold with deal-breakers | 32-agent adversarial swarm, severity scoring |
| **First Principles** (assumption challenging) | Assumption audit + rebuilt reasoning scaffold | — |
| **BeCreative** (lateral thinking) | Inversion, adjacent domains, constraint removal scaffold | — |
| **The Algorithm** (7-phase execution) | Success criteria on every output | ISC tables, LCARS display, phase tooling |
| **Memory System** | 3 markdown files, on-demand loading | JSONL logs, session harvesting, signals, WORK/ dirs |

Everything else — Telos, Skill System, Hook System, Agent Factory, Voice System, Observability — is deliberately out of scope. PAI is the full platform; this is one small sharp tool.

## Install

Copy the extension to your pi extensions directory:

```bash
# Clone
git clone https://github.com/coctostan/pi-pai-lite.git

# Install
mkdir -p ~/.pi/agent/extensions/pi-pai-lite
cp -r pi-pai-lite/index.ts pi-pai-lite/src/ pi-pai-lite/README.md ~/.pi/agent/extensions/pi-pai-lite/
```

Or for development/testing:

```bash
pi -e ./index.ts
```

The extension registers its tools and commands on load. No configuration needed.

## Tools

Two tools the LLM can call on its own or when prompted:

### `think` — Structured Thinking

Provides a structured prompt scaffold that the LLM reasons through. Zero extra API calls — the scaffold is returned as a tool result and the LLM fills it out in the same turn.

**Modes:**

| Mode | What it does | When to use |
|---|---|---|
| `council` | 4 perspectives: Pragmatist, Architect, Skeptic, User Advocate. Forces disagreements before synthesis. | Architectural decisions, trade-off analysis, design reviews |
| `red_team` | 5+ failure modes with worst-case scenarios, deal-breakers, mitigations | Risk assessment, security review, pre-launch checks |
| `first_principles` | Lists assumptions, audits each (true/inherited/false), rebuilds reasoning from base truths | Challenging "that's how we've always done it", questioning conventions |
| `be_creative` | Inversion, adjacent-domain inspiration, constraint removal, 3 genuinely novel approaches | When stuck, exploring alternatives, breaking out of local optima |

**Auto-routing:** When no mode is specified, conservative keyword matching selects the mode. Security terms → `red_team`. Assumption language → `first_principles`. "Stuck" or "what if" → `be_creative`. Everything else → `council` (the safest general-purpose default).

**Memory integration:** The think tool automatically reads any stored memory files and includes them as context. The LLM doesn't need to call `memory` first.

Every response ends with **Success Criteria** — a checklist defining what "done" looks like. This is PAI's ISC (Initial Success Criteria) pattern distilled to its minimum.

### `memory` — Persistent Files

Three markdown files under `~/.pi/pai/`, created on first use:

| File | Purpose | Typical use |
|---|---|---|
| `preferences.md` | Tech stack, coding style, how you like things | Replace when preferences change |
| `learnings.md` | Discoveries made during work | Append-only — grows over time |
| `context.md` | Current projects, goals, focus areas | Replace when context shifts |

**Actions:**
- `read` — Get file contents (truncated to last 4K characters if large)
- `append` — Add timestamped entry to a file
- `replace` — Overwrite a file completely

Memory is loaded on demand — no system prompt overhead during normal use.

## Commands

| Command | What it does |
|---|---|
| `/council <question>` | Force council mode thinking |
| `/redteam <question>` | Force red team mode thinking |
| `/firstprinciples <question>` | Force first principles mode thinking |
| `/creative <question>` | Force creative/lateral mode thinking |
| `/pai` | Show help |
| `/pai memory` | Show memory file summary |

Commands inject a user message with the forced mode. The LLM calls the think tool and reasons through the scaffold naturally.

## Examples

```
/council Should we use a monorepo or multi-repo for our 5-person team?
```

The LLM receives a council scaffold and responds with four distinct perspectives, identifies where they conflict, and synthesizes a recommendation with success criteria.

```
/redteam Deploying to production without a staging environment
```

Returns 5+ specific failure modes, worst-case scenarios, a deal-breaker analysis, and concrete mitigations.

```
Ask the LLM directly:
"Use the think tool to analyze whether we should add a database to this project"
```

Auto-routes to council mode. If you'd previously stored preferences via the memory tool, they're included as context.

## Design Principles

- **Scaffold, not inference.** The think tool returns structured prompts. The LLM reasons through them. No sub-agent calls, no extra API round-trips, no added latency or cost.
- **Memory on demand.** Files are only read when tools are called. Simple tasks get zero context overhead.
- **Conservative auto-routing.** Narrow keyword triggers with council as the default. Misrouting toward council is harmless; misrouting away from it is confusing.
- **Never fail.** Memory errors degrade gracefully — think continues without memory and notes it. File I/O errors throw to the framework for proper error signaling.

## File Structure

```
pi-pai-lite/
├── index.ts                     # Extension entry: registers tools + commands
├── src/
│   ├── memory.ts                # Memory tool: read/append/replace + truncation
│   ├── think.ts                 # Think tool: routing, memory integration, status
│   ├── router.ts                # Auto-mode selection (conservative keyword matching)
│   └── modes/
│       ├── council.ts           # Council prompt scaffold
│       ├── red-team.ts          # Red team prompt scaffold
│       ├── first-principles.ts  # First principles prompt scaffold
│       └── be-creative.ts       # Creative/lateral prompt scaffold
└── README.md

~/.pi/pai/                       # User data (created on first use)
├── preferences.md
├── learnings.md
└── context.md
```

## Acknowledgments

**[Daniel Miessler](https://danielmiessler.com)** and [PAI (Personal AI Infrastructure)](https://github.com/danielmiessler/Personal_AI_Infrastructure) — the original vision of structured thinking modes, persistent memory, and personal AI infrastructure that this project adapts. PAI's Council, Red Team, First Principles, and BeCreative systems are the direct ancestors of the four modes in pi-pai-lite. If you want the full platform — agents, voice, observability, the Algorithm, Telos, and everything else — go use PAI. This is just the seed.

**[Mario Zechner](https://github.com/badlogic)** and [pi](https://github.com/badlogic/pi-mono) — the coding agent and extension API that makes this possible.

## License

MIT
