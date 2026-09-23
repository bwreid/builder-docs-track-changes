import { NavLink } from "react-router";

import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/", label: "Change Reports" },
  { to: "/tracked", label: "Tracked Changes" },
  { to: "/criteria", label: "Criteria" },
  { to: "/docs-mapping", label: "Docs Mapping" },
] as const;

export function AppNav() {
  return (
    <nav className="flex items-center gap-4">
      {NAV_LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === "/"}
          className={({ isActive }) =>
            cn(
              "text-sm text-muted-foreground hover:text-foreground",
              isActive && "font-medium text-foreground",
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
