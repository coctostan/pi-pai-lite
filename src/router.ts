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

// Priority order: red_team > first_principles > be_creative > council (default).
// Security/risk keywords take highest priority. If no patterns match, council
// is the safest default as the most general-purpose mode.
export function autoSelectMode(problem: string): ThinkMode {
  if (matchesAny(problem, RED_TEAM_PATTERNS)) return "red_team";
  if (matchesAny(problem, FIRST_PRINCIPLES_PATTERNS)) return "first_principles";
  if (matchesAny(problem, CREATIVE_PATTERNS)) return "be_creative";
  return "council";
}
