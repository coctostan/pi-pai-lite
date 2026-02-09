# Review: `pi-pai-lite` design (docs/plans/2026-02-08-pi-pai-lite-design.md)

**Review date:** 2026-02-08  
**Scope:** Feasibility vs pi extension API, gaps/edge cases, simplification opportunities (cuts only), prompt scaffold quality, toggle design.

---

## 0) Executive summary

The core MVP is **feasible** in pi: a small extension can register custom tools (`think`, `memory`), register slash commands, update the footer status line, and persist *session-scoped* state via `pi.appendEntry()`.

However, several design points are **not achievable as written** with pi’s current APIs:

- **“Deregister tools”** is not an API concept. You can **disable/hide tools** using `pi.setActiveTools()` (preferred) or **block** them in `tool_call`, but you cannot unregister them once registered.
- **“Skill auto-discovered from the extension directory”** is not how pi skills work. Skills are discovered from `~/.pi/agent/skills/`, `.pi/skills/`, or **pi packages** (`pi.skills` / `skills/`), not from `~/.pi/agent/extensions/...` by default.
- **“Skill removed when toggled off”** is not supported dynamically (resource discovery happens at startup/reload).
- **State persistence via `pi.appendEntry()`** persists **within a session file** (resume/restart), not “globally across all sessions.” Starting a brand-new session will not carry that toggle unless you also store it outside the session.

Net: buildable if you **cut/relax** “fully invisible toggle” and “skill removal,” and implement toggling via **active-tool sets**.

---

## 1) Feasibility vs pi extension API

### 1.1 Tool registration (`think`, `memory`)

**Feasible.** `pi.registerTool()` supports:
- JSON-schema parameters via `@sinclair/typebox`
- execution with access to `ctx` (so you can read files, update status, etc.)
- streaming updates via `onUpdate`

**Important API constraints to reflect in the design:**
- Tool outputs must be **truncated** to avoid blowing up context (pi docs call out ~50KB/2000 lines defaults). If memory files grow, `memory.read` and `think` (which embeds memory) need truncation behavior.
- Enum schemas: for Google compatibility, pi recommends `StringEnum` from `@mariozechner/pi-ai` rather than `Type.Union([Type.Literal(...)])`.

### 1.2 Command registration (`/pai`, `/council`, ...)

Mostly feasible, but one command as written is not:

- `/pai`, `/council`, `/redteam`, `/firstprinciples`, `/creative` are fine.
- **`/pai memory` cannot be registered as a separate command name**. `pi.registerCommand()` registers a single command token (e.g. `pai`). Anything after it is the **args string**. So `/pai memory` must be implemented as `/pai` with args parsing (`args === "memory"`).

### 1.3 Toggle behavior ("deregister tools", "skill removed")

**As written: not feasible.**

- There is **no** `pi.deregisterTool()` / `pi.unregisterTool()` API.
- Skills are discovered at startup; there is no supported “remove skill from system prompt” toggle at runtime.

**What pi does support (and what the design should align to):**

- **Tool on/off:** `pi.setActiveTools(names)` controls what tools appear in the system prompt and are callable. This is how the official `plan-mode` example toggles.
- **Additional safety:** optionally block tool calls when disabled via `pi.on("tool_call", ...)` returning `{ block: true }`.

**Hidden cost of `setActiveTools`:** it sets the entire active-tool list. If other extensions also adjust tools, naive toggling can clobber other tools. You’d need to preserve/merge the previous tool set (implementation detail, but it affects the “toggle” design).

### 1.4 Status line updates

**Feasible.** `ctx.ui.setStatus("key", "text")` is supported and cleared via `undefined`.

Caveat: in non-interactive modes (`ctx.hasUI === false`), status updates are no-ops, so the extension must not rely on them for correctness.

### 1.5 Skill loading / “on demand” behavior

**Partially feasible, but not as described.**

- Pi always includes **skill descriptions** (not full content) in the system prompt after discovery.
- The **full SKILL.md** is loaded when the model chooses to `read` it or when the user runs `/skill:name`.

What’s infeasible in the current doc:
- A SKILL.md placed under `~/.pi/agent/extensions/pi-pai-lite/skill/SKILL.md` is **not discovered** by skill discovery rules unless:
  - the user also adds that path in `settings.json` (`skills: [...]`), or
  - you distribute pi-pai-lite as a **pi package** and declare skills in `package.json` under `pi.skills` (or use a conventional `skills/` dir).

### 1.6 State persistence via `pi.appendEntry()`

**Feasible, but scope-limited.** `pi.appendEntry()` persists inside the **current session file** and is recoverable on `session_start` by scanning entries.

Gap vs design statement:
- This does **not** persist across new sessions created by `/new` (because those sessions have independent histories).

If the design requires “persist across all sessions,” that’s outside what `appendEntry()` alone gives you.

---

## 2) Gaps / edge cases / failure modes

### 2.1 First run / missing files

Design covers “missing file → empty string,” which is good.

Missing details to spell out (because they affect behavior):
- Ensure `~/.pi/pai/` directory creation is handled before any read/append/replace.
- Define file encoding explicitly (assume UTF-8) and normalize line endings.

### 2.2 Memory growth and context blow-ups

Because `think` “reads memory automatically,” it will likely embed memory contents into the tool result. That can easily exceed tool-output limits.

You need explicit behavior for:
- `preferences.md` or `context.md` becoming large (accidental paste, logs, etc.)
- `learnings.md` being append-only and growing without bound

Even without “compaction features,” you still need:
- truncation strategy (head vs tail) and
- explicit “[truncated] full file at path …” notices in tool output

### 2.3 Concurrent access / multiple pi instances

Within a single agent loop, tool calls are effectively serial, but across **multiple pi processes** (or external edits):
- append operations can interleave
- partial writes can occur if the process crashes mid-write

Minimal mitigation to document:
- use append operations that are atomic at the OS level where possible (Node’s `appendFile` with O_APPEND semantics)
- tolerate malformed separators (don’t rely on parsing; the system is “read as text”)

### 2.4 File corruption / binary content

If a memory file becomes binary/invalid UTF-8, naive reads can throw or return mojibake.

The design should specify:
- how `memory.read` reports read errors (tool result `isError: true` + message)
- how `think` behaves when memory read fails (continue without memory vs fail)

### 2.5 Path safety

Because you’re writing under `~/.pi/pai/`, ensure:
- file argument is strictly enumerated (as in the design)
- no user-controlled path is joined unsafely

This is already implied by the `file: "preferences"|...` enum; worth keeping.

---

## 3) Simplification opportunities (cuts only)

### 3.1 Cut auto-mode detection (or make it opt-in later)

The “auto” router adds complexity and introduces surprising behavior (misclassification) for marginal benefit, especially since you already provide explicit commands (`/council`, `/redteam`, …).

For an MVP, the simplest cut is:
- default `mode` to **council**, and
- keep explicit mode commands for everything else.

### 3.2 Cut the “fully invisible” toggle requirement

Given the API constraints (no unregister, no dynamic skill removal), “completely invisible” is expensive to approximate and will remain leaky.

To stay lite, cut these claims from the design:
- “tools deregistered”
- “skill removed”
- “zero footprint in LLM context” (skills/tool lists are part of system prompt when enabled; and skills can’t be dynamically undiscovered)

### 3.3 Cut per-mode scoring detail in Red Team

Severity+likelihood scoring tends to create pseudo-precision. If the goal is “lite structured thinking,” consider cutting scoring and keeping:
- failure modes + mitigations
- worst-case narrative

This keeps red-team meaningfully distinct while reducing ceremony.

### 3.4 Cut `/pai memory` as a separate command

Since `/pai memory` can’t be a separate command name anyway, the MVP can:
- keep only `/pai` and have `/pai memory` be an argument mode, **or**
- cut it entirely and rely on the `memory` tool.

(If you keep it, it’s still just `/pai` args parsing.)

---

## 4) Prompt scaffold quality (differentiation + self-critique risks)

### 4.1 Will the scaffolds produce meaningfully different reasoning?

They are directionally distinct, but **as written they risk converging** to the model’s default “balanced analysis” voice because:
- Council and First Principles both ask for trade-offs and synthesis.
- Red Team can degenerate into generic “consider security, performance, reliability” lists.
- BeCreative prompts can become “brainstorm 3 ideas” without concrete novelty.

What’s good:
- Each mode has a clear intent and section list.
- “Success Criteria” at the end is a consistent forcing function.

What’s weak / too similar:
- Council’s perspectives are not constrained enough to prevent them from agreeing too quickly.
- First principles risks being a rephrasing of council synthesis unless it forces explicit assumption invalidation.

### 4.2 “LLM grading its own homework” concern

This concern applies most to:
- **Red Team** (model critiques its own plan) and
- **Council skeptic** perspective.

In a lite system (single model, no external verifier), you can’t eliminate this. The best you can do within the same feature set is to:
- force explicit uncertainty and disconfirming evidence
- require the skeptic/red-team sections to propose at least one **deal-breaker** scenario (not just mild caveats)

If you don’t want to tune prompts, the simpler cut is to **accept** the limitation and avoid overselling it as “adversarial.”

---

## 5) Toggle design assessment (what’s cleanest in pi)

### 5.1 Deregistering tools is not the right approach (not supported)

Pi’s supported mechanism is:
- register tools once
- toggle availability via `pi.setActiveTools()`

This has the additional advantage that tools are removed from the system prompt when inactive, which matches the intent of “off.”

### 5.2 What to watch out for with `setActiveTools`

- It is a **global** active-tools set. If you overwrite it without preserving the prior set, you may disable other extension tools or user-preferred tools.
- If you want the toggle to be well-behaved, you must merge:
  - current active tools
  - plus/minus `{think, memory}`

(Still lite, but important.)

### 5.3 Skills cannot be toggled the same way

There is no `setActiveSkills()` equivalent. If “PAI off” must hide the skill from the system prompt, you’d need to cut that requirement, because dynamic skill discovery/unloading is not part of the extension API.

---

## 6) Concrete design doc edits recommended (cuts/clarifications)

To make the design match pi reality while staying lite, update the document to:

- Replace “tools deregistered” with “tools removed from active tool set via `pi.setActiveTools()`.”
- Replace “skill auto-discovered from extension directory” with accurate skill discovery rules (or remove the skill from the MVP).
- Replace “/pai memory command” with “/pai with args `memory`” (or cut).
- Clarify that `pi.appendEntry()` persistence is **per-session**; if you want global persistence, either cut it or store a tiny state file (implementation choice).

No new features are required—just align claims and reduce scope where the API doesn’t support it.
