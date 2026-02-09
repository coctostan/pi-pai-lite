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
