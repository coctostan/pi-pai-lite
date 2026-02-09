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
