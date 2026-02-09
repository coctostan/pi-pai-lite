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
