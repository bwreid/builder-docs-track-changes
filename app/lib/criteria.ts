// Shared shape/formatting for the editable Criteria guidance (server/lib/criteria-store.ts),
// used to build the hidden agent-chat context on both the reports page and the tracked page.
export type Criteria = {
  selectionCriteria: string;
  outputFormat: string;
  outputTone: string;
};

export function formatCriteriaBlock(criteria: Criteria): string {
  const lines: string[] = [];
  if (criteria.selectionCriteria.trim()) {
    lines.push(`What to look for:\n${criteria.selectionCriteria.trim()}`);
  }
  if (criteria.outputFormat.trim()) {
    lines.push(`Output format:\n${criteria.outputFormat.trim()}`);
  }
  if (criteria.outputTone.trim()) {
    lines.push(`Output tone:\n${criteria.outputTone.trim()}`);
  }
  if (lines.length === 0) return "";
  return `Team guidance for recommending doc changes:\n${lines.join("\n\n")}\n\n`;
}
