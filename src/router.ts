export type ThinkMode = "council" | "red_team" | "first_principles" | "be_creative";

export function autoSelectMode(problem: string): ThinkMode {
  return "council";
}
