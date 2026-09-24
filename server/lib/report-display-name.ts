const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

// Mirrors app/routes/_index.tsx's and app/routes/tracked.tsx's formatRange,
// for server-side text (ticket summaries, PR titles) that references a
// report by name.
export function reportDisplayName(report: {
  userChosenName: string | null;
  rangeStart: string;
  rangeEnd: string | null;
}): string {
  if (report.userChosenName) return report.userChosenName;
  const start = dateFormatter.format(new Date(report.rangeStart));
  if (!report.rangeEnd) return "Since " + start;
  return start + " - " + dateFormatter.format(new Date(report.rangeEnd));
}
