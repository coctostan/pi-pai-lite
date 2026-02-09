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
