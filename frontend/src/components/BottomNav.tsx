import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Home, Search, Users, MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { name: "Home", path: "/home", icon: Home },
  { name: "Explore", path: "/explore", icon: Search },
  { name: "Matches", path: "/matches", icon: Users },
  { name: "Chat", path: "/chat", icon: MessageCircle },
];

/** Fixed mobile bottom-tab bar (hidden on md+). */
export function BottomNav() {
  const location = useLocation();
  const reduce = useReducedMotion();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-header border-t border-border bg-card/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active =
            location.pathname === tab.path ||
            location.pathname.startsWith(`${tab.path}/`);
          return (
            <li key={tab.name} className="flex-1">
              <Link
                to={tab.path}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[44px] flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
                  active
                    ? "text-brand"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId={reduce ? undefined : "bottomnav-indicator"}
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-brand"
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  />
                )}
                <Icon className="size-5" />
                <span>{tab.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
