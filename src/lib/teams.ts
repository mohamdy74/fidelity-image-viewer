// Maps a constructor name to a CSS team-color token defined in styles.css.
const TEAMS: [RegExp, string][] = [
  [/ferrari/i, "--team-ferrari"],
  [/mclaren/i, "--team-mclaren"],
  [/mercedes/i, "--team-mercedes"],
  [/red bull/i, "--team-redbull"],
  [/aston/i, "--team-aston"],
  [/alpine/i, "--team-alpine"],
  [/williams/i, "--team-williams"],
  [/haas/i, "--team-haas"],
  [/(rb f1|racing bulls|visa|^rb)/i, "--team-rb"],
  [/(sauber|audi|kick)/i, "--team-audi"],
  [/cadillac/i, "--team-cadillac"],
];

export function teamColor(team: string | null | undefined): string {
  const hit = team ? TEAMS.find(([re]) => re.test(team)) : undefined;
  return `var(${hit ? hit[1] : "--color-muted-foreground"})`;
}
