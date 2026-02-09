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
