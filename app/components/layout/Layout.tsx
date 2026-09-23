import { AgentSidebar, AgentToggleButton } from "@agent-native/core/client/agent-chat";
import { HeaderActionsProvider } from "@agent-native/toolkit/app-shell";
import { IconMessageCircle2 } from "@tabler/icons-react";

import { AppNav } from "@/components/layout/app-nav";
import { SettingsPanel } from "@/components/settings-panel";
import { TAB_ID } from "@/lib/tab-id";

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * App shell with the agent rail: this app's report → summary flow hands off
 * to the agent (see `delegate-to-agent`), so the right AgentSidebar is
 * mounted here rather than left as the blank-canvas default.
 */
export function Layout({ children }: LayoutProps) {
  return (
    <HeaderActionsProvider>
      <AgentSidebar
        position="right"
        storageKey="app-agent-sidebar"
        browserTabId={TAB_ID}
        chatOnly={false}
      >
        <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
            <AppNav />
            <div className="flex items-center gap-1">
              <SettingsPanel />
              <AgentToggleButton icon={<IconMessageCircle2 className="size-4" />} />
            </div>
          </header>
          <main className="agent-native-app-main min-w-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </main>
        </div>
      </AgentSidebar>
    </HeaderActionsProvider>
  );
}
