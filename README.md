# Change Reports

An agent-native app that watches merged pull requests on `BuilderIO/agent-native`,
summarizes what shipped, and flags which pages on agent-native.com/docs are now
out of date — then helps you take each flagged page all the way to a tracked
Jira ticket and GitHub pull request.

## Features

### Change reports

- Run a report for the last 7 or 14 days, since your last report, or a custom
  date range, over merged PRs on `BuilderIO/agent-native`.
- The agent summarizes what shipped, writes a themed narrative, and — cross-
  referencing the docs map below — flags specific agent-native.com/docs pages
  that likely need updating, with a reason for each.
- Reports are renamable, collapsible, and deletable from the Change Reports
  home page.

### Tracked changes

- Track a flagged doc suggestion to queue it for exact before/after change
  research; untrack to drop it.
- Once tracked, the agent finds the specific sentence(s) on the live doc page
  that should change and proposes verbatim before/after text with reasoning.
  Re-suggest at any point to have it research again.
- A dedicated Tracked Changes page groups everything by report in a left nav,
  orders items by when they were tracked, and lets you collapse any card or
  any individual before/after block.
- Ignore individual changes within a suggestion to exclude just those from
  the eventual pull request, without dropping the whole suggestion.
- Rename a tracked change or a report — a cosmetic display name that never
  touches the underlying doc link or report data.

### Jira integration

- Create a Jira ticket for a tracked change with one click, or add it as a
  comment on an existing ticket already open for that report.
- When a pull request is opened or updated for a ticketed change, a comment
  linking the PR is posted back to the ticket automatically.
- Ticket titles track the report's current display name and are kept in sync
  if you rename the report later.

### GitHub integration

- Open a draft pull request that applies a tracked change's before/after
  edit directly to the real `.mdx` source file, or add the change as a new
  commit onto an existing open PR from the same report.
- PR titles track the report's current display name, same as Jira tickets.

### Docs map & criteria

- The Docs Mapping page maintains the list of agent-native.com/docs pages
  (with topics) the agent is allowed to suggest updates against — add, edit,
  delete, or re-scrape entries.
- The Criteria page holds editable guidance the agent follows when deciding
  which docs need updating and how to write suggestions: what to look for,
  output format, and tone.

### Settings

- Connect Jira (site URL, account email, API token) and GitHub (personal
  access token) from the settings panel to enable ticket/PR creation.

## Develop locally

```bash
corepack enable
pnpm install
pnpm dev
```

Then open the app and add your Jira and GitHub credentials in Settings to
enable the ticket/PR features.

### Database

This app uses PGlite for local development via Drizzle. After editing
`drizzle/schema.ts`:

```bash
pnpm db:generate
pnpm db:migrate
```

`pnpm db:migrate` requires the dev server to be stopped first — see
`drizzle/START_HERE.md`.
