import { createRequire } from "node:module";

import { agentNative } from "@agent-native/core/vite";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

const reactRouterPlugins = reactRouter as unknown as () => any[];
const agentNativePlugins = agentNative as unknown as (
  options?: Parameters<typeof agentNative>[0],
) => any[];
const appRequire = createRequire(import.meta.url);
const coreRequire = createRequire(
  appRequire.resolve("@agent-native/core/vite"),
);

export default defineConfig({
  optimizeDeps: {
    // React Router discovers route modules outside Vite's default HTML crawl.
    // Scan the shell and Chat route before accepting requests so a cold
    // standalone consumer does not leave the browser waiting on the full
    // composer/editor graph one module at a time.
    entries: [
      "app/entry.client.tsx",
      "app/root.tsx",
      "app/components/layout/Layout.tsx",
      "app/routes/{_index,tracked,criteria,docs-mapping}.tsx",
    ],
    // The Doc Block preview (app/components/doc-block-preview.tsx) pulls in
    // @agent-native/core/blocks -> lowlight -> highlight.js, a package with
    // dual CJS/ESM conditional exports three levels deep. Force it through
    // Vite's dependency pre-bundling explicitly rather than relying on the
    // scanner to discover and correctly interop-wrap it on its own — without
    // this the browser can end up requesting highlight.js's CJS build
    // directly, which throws "does not provide an export named 'default'".
    // Neither package is a direct dependency of this app (pnpm's strict
    // node_modules doesn't expose them at the project root), so they must be
    // reached through Vite's "nested dependency" `>` syntax rather than by
    // bare name.
    include: [
      "@agent-native/core > lowlight",
      "@agent-native/core > lowlight > highlight.js",
    ],
  },
  resolve: {
    // Core and toolkit both use assistant-ui contexts. Keep published and
    // linked graphs on one store so the agent sidebar can compose reliably.
    dedupe: [
      "@assistant-ui/react",
      "@assistant-ui/core",
      "@assistant-ui/store",
      "@assistant-ui/tap",
    ],
    alias: [
      {
        find: /^@assistant-ui\/react$/,
        replacement: coreRequire.resolve("@assistant-ui/react"),
      },
      {
        find: /^@assistant-ui\/core$/,
        replacement: coreRequire.resolve("@assistant-ui/core"),
      },
      {
        find: /^@assistant-ui\/store$/,
        replacement: coreRequire.resolve("@assistant-ui/store"),
      },
      {
        find: /^@assistant-ui\/tap$/,
        replacement: coreRequire.resolve("@assistant-ui/tap"),
      },
      {
        find: /^assistant-stream$/,
        replacement: coreRequire.resolve("assistant-stream"),
      },
      {
        find: /^assistant-stream\/utils$/,
        replacement: coreRequire.resolve("assistant-stream/utils"),
      },
    ],
  },
  plugins: [
    ...reactRouterPlugins(),
    ...agentNativePlugins({
      // shiki only runs in AssistantChat's useEffect — keep it out of the
      // CF Pages Functions bundle (25 MiB limit).
      ssrStubs: ["shiki"],
    }),
  ],
});
