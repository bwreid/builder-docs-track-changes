// Seed data for the `docs_map_entries` table (see server/lib/docs-map-store.ts),
// used only the first time that table is read and found empty. Once seeded,
// the database — editable from the Docs Mapping page, or refreshed via the
// re-scrape action — is the source of truth; this file stops being read.
export const DOCS_BASE_URL = "https://www.agent-native.com";

export interface DocEntry {
  title: string;
  topics: string[];
}

export const AGENT_NATIVE_DOCS_SEED: Record<string, DocEntry> = {
  // Overview
  "/docs/": { title: "Getting Started", topics: ["getting started", "quickstart", "setup"] },
  "/docs/what-is-agent-native/": {
    title: "What is Agent-Native?",
    topics: ["why build agents", "how agent-native works", "when to use agent-native"],
  },
  "/docs/key-concepts/": {
    title: "Key Concepts",
    topics: ["core concepts", "actions", "application state", "agent chat"],
  },

  // Deployment
  "/docs/deployment/": { title: "Deployment Overview", topics: ["deployment", "hosting", "going to production"] },
  "/docs/deploy-an-app/": { title: "Deploy an app", topics: ["deploying an app", "release"] },
  "/docs/workspace-deployment/": { title: "Workspace Deployment", topics: ["workspace-level deployment", "multi-app deploys"] },
  "/docs/node-js/": { title: "Node.js Hosting", topics: ["node.js hosting"] },
  "/docs/docker/": { title: "Docker Hosting", topics: ["docker", "containers"] },
  "/docs/vercel/": { title: "Vercel Hosting", topics: ["vercel deployment"] },
  "/docs/netlify/": { title: "Netlify Hosting", topics: ["netlify deployment"] },
  "/docs/cloudflare/": { title: "Cloudflare Hosting", topics: ["cloudflare deployment", "cloudflare workers"] },
  "/docs/aws-lambda/": { title: "AWS Lambda Hosting", topics: ["aws lambda deployment", "serverless"] },
  "/docs/deno-deploy/": { title: "Deno Deploy Hosting", topics: ["deno deploy"] },
  "/docs/azure-static-web-apps/": { title: "Azure Static Web Apps Hosting", topics: ["azure static web apps"] },
  "/docs/koyeb/": { title: "Koyeb Hosting", topics: ["koyeb deployment"] },
  "/docs/render/": { title: "Render Hosting", topics: ["render deployment"] },
  "/docs/neon/": { title: "Neon Postgres", topics: ["neon database", "postgres provider"] },
  "/docs/supabase/": { title: "Supabase Postgres", topics: ["supabase database"] },
  "/docs/aws-rds/": { title: "Amazon RDS for PostgreSQL", topics: ["aws rds", "rds postgres"] },
  "/docs/cloud-sql/": { title: "Cloud SQL for PostgreSQL", topics: ["google cloud sql"] },
  "/docs/azure-postgresql/": { title: "Azure Database for PostgreSQL", topics: ["azure postgres"] },
  "/docs/postgres/": { title: "Plain Postgres", topics: ["self-hosted postgres", "database setup"] },
  "/docs/ssr-caching/": { title: "SSR Caching", topics: ["ssr caching", "cdn cache", "server rendering"] },
  "/docs/deployment-environment-variables/": {
    title: "Deployment: Environment Variables",
    topics: ["env vars in deployment", "deploy-level configuration"],
  },
  "/docs/updating-ui-in-production/": {
    title: "Updating UI in Production",
    topics: ["shipping ui changes", "production updates"],
  },

  // Toolkit
  "/docs/agent-native-toolkit/": { title: "Toolkit Overview", topics: ["agent-native toolkit", "shared workspace ui"] },
  "/docs/toolkit-ui/": { title: "Toolkit UI Primitives", topics: ["design system", "toolkit ui primitives"] },
  "/docs/toolkit-editors-canvases/": { title: "Toolkit Editors & Canvases", topics: ["editors", "canvas surfaces"] },
  "/docs/toolkit-context-knowledge/": { title: "Toolkit Context & Knowledge", topics: ["context awareness", "agent knowledge"] },
  "/docs/toolkit-sharing/": { title: "Toolkit Sharing", topics: ["sharing", "resource sharing", "privacy"] },
  "/docs/toolkit-collaboration/": { title: "Toolkit Collaboration", topics: ["real-time collaboration", "yjs", "presence"] },
  "/docs/toolkit-history/": { title: "Toolkit History", topics: ["history", "undo redo", "version history"] },
  "/docs/toolkit-comments-review/": { title: "Toolkit Comments & Review", topics: ["comments", "review workflow"] },
  "/docs/toolkit-observability/": { title: "Toolkit Observability", topics: ["observability", "traces", "evals"] },
  "/docs/toolkit-settings/": { title: "Toolkit Settings", topics: ["settings ui", "app settings"] },
  "/docs/toolkit-org-team/": { title: "Toolkit Org & Team", topics: ["organizations", "teams"] },
  "/docs/toolkit-setup-connections/": { title: "Toolkit Setup & Connections", topics: ["onboarding checklist", "provider connections", "secrets ui"] },
  "/docs/toolkit-command-navigation/": { title: "Toolkit Command & Navigation", topics: ["command palette", "navigation", "app shell"] },
  "/docs/toolkit-resources/": { title: "Toolkit Resources", topics: ["resources", "folders", "favorites"] },
  "/docs/toolkit-agent-ux/": { title: "Toolkit Agent UX", topics: ["agent sidebar", "composer", "agent ux"] },
  "/docs/toolkit-capability-packages/": { title: "Toolkit Capability Packages", topics: ["capability packages"] },
  "/docs/package-lifecycle/": { title: "Package Lifecycle", topics: ["package versioning", "release lifecycle"] },
  "/docs/versioning-and-stability/": { title: "Versioning & Stability", topics: ["semver", "stability guarantees", "breaking changes"] },

  // Core architecture — server
  "/docs/server-overview/": { title: "Server Overview", topics: ["server architecture", "nitro", "h3"] },
  "/docs/server-database/": { title: "Server: Database", topics: ["drizzle", "sql schema", "database client"] },
  "/docs/server-middleware/": { title: "Server: Middleware", topics: ["middleware"] },
  "/docs/server-plugins/": { title: "Server: Plugins", topics: ["nitro plugins", "server plugins"] },
  "/docs/server-routes/": { title: "Server: Routes", topics: ["api routes", "server routes"] },

  // Core architecture — client
  "/docs/client-overview/": { title: "Client Overview", topics: ["client architecture", "react router"] },
  "/docs/client-data/": { title: "Client: Data & Sync", topics: ["useActionQuery", "useActionMutation", "data fetching"] },
  "/docs/client-agent-chat/": { title: "Client: Agent Chat", topics: ["agent sidebar", "sendToAgentChat", "chat client"] },
  "/docs/client-routing/": { title: "Client: Routing", topics: ["client routing", "react router routes"] },
  "/docs/client-advanced/": { title: "Client: Advanced", topics: ["advanced client apis"] },
  "/docs/client-sync-internals/": { title: "Client: Sync Internals", topics: ["real-time sync internals", "polling"] },
  "/docs/client-entry-points/": { title: "Client: Entry Points", topics: ["entry.client", "entry.server", "root.tsx"] },

  // Core architecture — actions
  "/docs/actions-overview/": { title: "Actions Overview", topics: ["actions", "defineAction"] },
  "/docs/actions-defining/": { title: "Defining Actions", topics: ["creating actions", "action schema", "zod"] },
  "/docs/actions-access-control/": { title: "Actions: Access & Authorization", topics: ["authorize", "access control", "needsApproval"] },
  "/docs/actions-run-context/": { title: "Actions: Run Context", topics: ["request context", "run context"] },
  "/docs/actions-other-surfaces/": { title: "Actions: Other Surfaces", topics: ["http api", "mcp actions", "cli actions"] },
  "/docs/actions-advanced/": { title: "Actions: Advanced & Legacy", topics: ["advanced action fields", "legacy actions"] },
  "/docs/actions-agent-tools/": { title: "Production Agent Access", topics: ["agent tool exposure", "production agent access"] },

  // Core architecture — misc
  "/docs/agent-surfaces/": { title: "Agent Surfaces", topics: ["agent surfaces", "chat surfaces"] },
  "/docs/internationalization/": { title: "Internationalization", topics: ["i18n", "localization"] },
  "/docs/file-uploads/": { title: "File Uploads", topics: ["file uploads", "blob storage"] },
  "/docs/environment-variables/": { title: "Environment Variables", topics: ["env vars", "deploy-level config"] },
  "/docs/agent-native-config/": { title: "Agent-Native Config", topics: ["agent-native.config.ts", "agent-native.json"] },

  // Apps
  "/docs/cloneable-saas/": { title: "Templates", topics: ["templates", "starter apps"] },
  "/docs/creating-templates/": { title: "Creating Templates", topics: ["authoring templates"] },
  "/docs/syncing-template-changes/": { title: "Syncing Template Changes", topics: ["template updates", "syncing changes"] },
  "/docs/pure-agent-apps/": { title: "Automation-First Apps", topics: ["automation-first apps", "headless agent apps"] },

  // Chat template
  "/docs/template-chat/": { title: "Chat Template Overview", topics: ["chat template"] },
  "/docs/template-chat-first-edits/": { title: "Chat: Your First Feature", topics: ["chat template first feature"] },
  "/docs/template-chat-developers/": { title: "Chat: Developer Guide", topics: ["chat template internals"] },

  // Calendar template
  "/docs/template-calendar/": { title: "Calendar Template Overview", topics: ["calendar template"] },
  "/docs/template-calendar-features/": { title: "Calendar: Features", topics: ["calendar features"] },
  "/docs/template-calendar-agent/": { title: "Calendar: Talk to the Agent", topics: ["calendar agent interactions"] },
  "/docs/template-calendar-integrations/": { title: "Calendar: Cross-App Use", topics: ["calendar integrations"] },
  "/docs/template-calendar-developers/": { title: "Calendar: Developer Guide", topics: ["calendar template internals"] },

  // Content template
  "/docs/template-content/": { title: "Content Template Overview", topics: ["content template"] },
  "/docs/template-content-editing/": { title: "Content: Writing & Organizing", topics: ["content editing"] },
  "/docs/template-content-databases/": { title: "Content: Collections & Forms", topics: ["content collections", "content forms"] },
  "/docs/template-content-sync/": { title: "Content: Local Files & Sync", topics: ["content local files", "content sync"] },
  "/docs/template-content-local-files/": { title: "Content: Local File Mode", topics: ["local file mode"] },
  "/docs/template-content-developers/": { title: "Content: Developer Guide", topics: ["content template internals"] },

  // Plans template
  "/docs/template-plan/": { title: "Plans: Visual Plans", topics: ["plans template"] },
  "/docs/template-plan-review-workflow/": { title: "Plans: Review & Comments", topics: ["plan review workflow"] },
  "/docs/template-plan-automations/": { title: "Plans: Events & Automations", topics: ["plan automations"] },
  "/docs/template-plan-local-and-desktop/": { title: "Plans: Local Files & Desktop", topics: ["plans desktop", "plans local files"] },
  "/docs/template-plan-developers/": { title: "Plans: Developer Guide", topics: ["plans template internals"] },
  "/docs/pr-visual-recap/": { title: "PR Visual Recap", topics: ["pr visual recap", "plan pr summaries"] },
  "/docs/plan-plugin/": { title: "Plan Plugin & Marketplace", topics: ["plan plugins", "plan marketplace"] },

  // Slides template
  "/docs/template-slides/": { title: "Slides Template Overview", topics: ["slides template"] },
  "/docs/template-slides-features/": { title: "Slides: Features", topics: ["slides features"] },
  "/docs/template-slides-agent/": { title: "Slides: Talk to the Agent", topics: ["slides agent interactions"] },
  "/docs/template-slides-integrations/": { title: "Slides: Cross-App Use", topics: ["slides integrations"] },
  "/docs/template-slides-developers/": { title: "Slides: Developer Guide", topics: ["slides template internals"] },

  // Analytics template
  "/docs/template-analytics/": { title: "Analytics Template Overview", topics: ["analytics template"] },
  "/docs/template-analytics-dashboards/": { title: "Analytics: Dashboards & Analyses", topics: ["analytics dashboards"] },
  "/docs/template-analytics-connectors/": { title: "Analytics: Connecting Data Sources", topics: ["analytics connectors", "data sources"] },
  "/docs/template-analytics-monitoring-and-sessions/": {
    title: "Analytics: Monitoring & Session Replay",
    topics: ["session replay", "monitoring"],
  },
  "/docs/template-analytics-developers/": { title: "Analytics: Developer Guide", topics: ["analytics template internals"] },

  // Mail template
  "/docs/template-mail/": { title: "Mail Template Overview", topics: ["mail template"] },
  "/docs/template-mail-agent/": { title: "Mail: Talking to the Agent", topics: ["mail agent interactions"] },
  "/docs/template-mail-inbox/": { title: "Mail: Inbox & Automations", topics: ["mail inbox", "mail automations"] },
  "/docs/template-mail-drafts-and-queue/": { title: "Mail: Drafts & Scheduling", topics: ["mail drafts", "mail scheduling", "send queue"] },
  "/docs/template-mail-developers/": { title: "Mail: Developer Guide", topics: ["mail template internals"] },

  // Clips template
  "/docs/template-clips/": { title: "Clips Template Overview", topics: ["clips template", "screen recording"] },
  "/docs/template-clips-features/": { title: "Clips: Features", topics: ["clips features"] },
  "/docs/template-clips-embed/": { title: "Clips: Embed Clips", topics: ["embedding clips"] },
  "/docs/template-clips-agent/": { title: "Clips: Talk to the Agent", topics: ["clips agent interactions"] },
  "/docs/template-clips-integrations/": { title: "Clips: Cross-App Use", topics: ["clips integrations"] },
  "/docs/template-clips-developers/": { title: "Clips: Developer Guide", topics: ["clips template internals", "clips storage"] },

  // Assets template
  "/docs/template-assets/": { title: "Assets Template Overview", topics: ["assets template"] },
  "/docs/template-assets-generation/": { title: "Assets: Generating & Refining", topics: ["asset generation"] },
  "/docs/template-assets-presets/": { title: "Assets: Presets", topics: ["asset presets"] },
  "/docs/template-assets-integrations/": { title: "Assets: Cross-App Use", topics: ["assets integrations"] },
  "/docs/template-assets-developers/": { title: "Assets: Developer Guide", topics: ["assets template internals"] },

  // Design template
  "/docs/template-design/": { title: "Design Template Overview", topics: ["design template", "visual editing"] },
  "/docs/template-design-features/": { title: "Design: Features", topics: ["design features", "canvas editing"] },
  "/docs/template-design-agent/": { title: "Design: Talk to the Agent", topics: ["design agent interactions"] },
  "/docs/template-design-integrations/": { title: "Design: Cross-App Use", topics: ["design integrations"] },
  "/docs/template-design-developers/": { title: "Design: Developer Guide", topics: ["design template internals", "live preview editing"] },

  // Dispatch template
  "/docs/template-dispatch/": { title: "Dispatch Template Overview", topics: ["dispatch template"] },
  "/docs/template-dispatch-features/": { title: "Dispatch: Features", topics: ["dispatch features"] },
  "/docs/template-dispatch-agent/": { title: "Dispatch: Talk to the Agent", topics: ["dispatch agent interactions"] },
  "/docs/template-dispatch-integrations/": { title: "Dispatch: Cross-App Use", topics: ["dispatch integrations"] },
  "/docs/template-dispatch-developers/": { title: "Dispatch: Developer Guide", topics: ["dispatch template internals"] },
  "/docs/template-dispatch-reference/": { title: "Dispatch: Action & Data Reference", topics: ["dispatch actions reference"] },

  // Forms template
  "/docs/template-forms/": { title: "Forms Template Overview", topics: ["forms template"] },
  "/docs/template-forms-features/": { title: "Forms: Features", topics: ["forms features"] },
  "/docs/template-forms-agent/": { title: "Forms: Talk to the Agent", topics: ["forms agent interactions"] },
  "/docs/template-forms-integrations/": { title: "Forms: Cross-App Use", topics: ["forms integrations"] },
  "/docs/template-forms-developers/": { title: "Forms: Developer Guide", topics: ["forms template internals"] },

  // Data, Auth & Governance
  "/docs/authentication/": { title: "Authentication", topics: ["auth", "login", "sign up", "sessions", "createAuthPlugin"] },
  "/docs/multi-tenancy/": { title: "Multi-Tenancy", topics: ["multi-tenancy", "org scoping"] },
  "/docs/organizations-teams-permissions/": {
    title: "Organizations, Teams & Permissions",
    topics: ["organizations", "teams", "roles", "permissions"],
  },
  "/docs/administered-deployments/": { title: "Administered Deployments", topics: ["managed deployments", "admin controls"] },
  "/docs/security/": { title: "Security & Data Scoping", topics: ["security", "sql injection", "data scoping", "owner_email"] },
  "/docs/sharing/": { title: "Sharing & Privacy", topics: ["sharing", "visibility", "privacy"] },
  "/docs/tracking/": { title: "Tracking & Analytics", topics: ["analytics tracking", "events"] },
  "/docs/audit-log/": { title: "Audit Log", topics: ["audit log"] },
  "/docs/doctor/": { title: "Doctor (Code Checks)", topics: ["agent-native doctor", "guards", "code checks"] },
  "/docs/observability/": { title: "Observability", topics: ["observability", "traces", "monitoring"] },
  "/docs/observational-memory/": { title: "Observational Memory", topics: ["observational memory", "long-term memory"] },
  "/docs/evals/": { title: "CI Eval Gate", topics: ["evals", "ci eval gate"] },

  // Using Your Agent
  "/docs/using-your-agent/": { title: "Using Your Agent Overview", topics: ["using the agent"] },
  "/docs/context-awareness/": { title: "Context Awareness", topics: ["context awareness", "view-screen", "navigation state"] },
  "/docs/agent-mentions/": { title: "Agent Mentions", topics: ["@mentions", "agent mentions"] },
  "/docs/voice-input/": { title: "Voice Input", topics: ["voice input"] },
  "/docs/drop-in-agent/": { title: "Drop-in Agent", topics: ["drop-in agent", "embeddable agent"] },
  "/docs/components/": { title: "Component API", topics: ["component api"] },
  "/docs/native-chat-ui/": { title: "Native Chat UI", topics: ["native chat ui"] },
  "/docs/agentkit/": { title: "AgentKit", topics: ["agentkit"] },
  "/docs/generative-ui/": { title: "Generative UI", topics: ["generative ui", "mcp apps ui"] },
  "/docs/embedding-sdk/": { title: "Embedding SDK", topics: ["embedding sdk"] },
  "/docs/real-time-collaboration/": { title: "Real-Time Collaboration", topics: ["real-time collaboration", "yjs", "presence"] },

  // Agent Resources
  "/docs/agent-resources/": { title: "Agent Resources Overview", topics: ["agent resources"] },
  "/docs/writing-agent-instructions/": { title: "Writing Agent Instructions", topics: ["agent instructions", "system prompt"] },
  "/docs/skills-guide/": { title: "Skills", topics: ["skills", "skill files"] },
  "/docs/agent-teams/": { title: "Custom Agents & Teams", topics: ["agent teams", "sub-agents"] },
  "/docs/workspace-management/": { title: "Workspace Governance", topics: ["workspace governance"] },
  "/docs/recurring-jobs/": { title: "Recurring Jobs", topics: ["recurring jobs", "scheduling", "cron"] },
  "/docs/automations/": { title: "Automations", topics: ["automations", "event triggers"] },
  "/docs/extensions/": { title: "Extensions", topics: ["extensions"] },
  "/docs/data-programs/": { title: "Data Programs", topics: ["data programs"] },
  "/docs/multi-app-workspace/": { title: "Multi-App Workspaces", topics: ["multi-app workspaces"] },
  "/docs/onboarding/": { title: "Onboarding & API Keys", topics: ["onboarding checklist", "api keys", "secrets registry"] },

  // Integrations
  "/docs/integrations/": { title: "Integrations Overview", topics: ["integrations"] },
  "/docs/messaging/": { title: "Messaging (Slack, Email...)", topics: ["messaging integrations", "slack", "email"] },
  "/docs/messaging-recipes/": { title: "Messaging Recipes", topics: ["messaging recipes"] },
  "/docs/messaging-internals/": { title: "Messaging Internals", topics: ["messaging internals", "webhooks"] },
  "/docs/dispatch/": { title: "Dispatch", topics: ["dispatch gateway"] },
  "/docs/portal/": { title: "Portal", topics: ["portal"] },
  "/docs/a2a-protocol/": { title: "A2A Protocol", topics: ["agent-to-agent protocol", "a2a"] },
  "/docs/mcp-clients/": { title: "MCP Clients (Add Tools)", topics: ["mcp clients", "adding mcp tools"] },
  "/docs/http-api/": { title: "HTTP API (Call Actions)", topics: ["http api", "calling actions over http"] },
  "/docs/mcp-protocol/": { title: "MCP Server (Expose Your App)", topics: ["mcp server", "exposing actions via mcp"] },
  "/docs/external-agents/": { title: "External Agents (Connect a Host)", topics: ["external agents", "connecting hosts"] },
  "/docs/external-agents-catalog/": { title: "External Agents Catalog", topics: ["external agents catalog"] },
  "/docs/agent-web-surfaces/": { title: "Public Agent Web", topics: ["public agent web surfaces"] },
  "/docs/mcp-apps/": { title: "MCP Apps (Inline UIs)", topics: ["mcp apps", "inline embeds"] },
  "/docs/webmcp/": { title: "WebMCP (Browser Tools)", topics: ["webmcp", "browser tools"] },
  "/docs/cross-app-sso/": { title: "Cross-App SSO", topics: ["cross-app sso"] },
  "/docs/notifications/": { title: "Notifications", topics: ["notifications", "notify()", "notification channels"] },
  "/docs/progress/": { title: "Progress", topics: ["progress reporting", "long-running tasks"] },
  "/docs/automation-connectors/": { title: "Workflow Connectors", topics: ["workflow connectors"] },
  "/docs/workspace-connections/": { title: "Workspace Connections", topics: ["workspace connections", "provider connections"] },

  // Advanced: Extend the Runtime
  "/docs/code-agents-ui/": { title: "Agent-Native Code UI", topics: ["code agents ui", "self-modifying code"] },
  "/docs/harness-agents/": { title: "Harness Agents", topics: ["harness agents", "agent engines"] },
  "/docs/sandbox-adapters/": { title: "Adapters", topics: ["sandbox adapters"] },
  "/docs/cli-adapters/": { title: "CLI Adapters", topics: ["cli adapters"] },
  "/docs/processors/": { title: "In-Loop Processors", topics: ["in-loop processors"] },
  "/docs/durable-resume/": { title: "Durable Resume", topics: ["durable resume"] },
  "/docs/durable-background-runs/": { title: "Durable Background Runs", topics: ["durable background runs"] },
  "/docs/blueprint-installer/": { title: "Blueprint Installer", topics: ["blueprint installer"] },
};
