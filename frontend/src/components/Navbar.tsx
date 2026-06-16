import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Heart,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Home,
  Search,
  Users,
  MessageCircle,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { getUnreadCount } from "@/services/notificationService";
import { connect, onNotificationCount } from "@/services/socketService";
import { Avatar } from "@/components/ui/avatar";
import { BottomNav } from "@/components/BottomNav";
import { popIn } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onLogout: () => void;
}

const NAV_LINKS = [
  { name: "Home", path: "/home", icon: Home },
  { name: "Explore", path: "/explore", icon: Search },
  { name: "Matches", path: "/matches", icon: Users },
  { name: "Chat", path: "/chat", icon: MessageCircle },
];

const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const location = useLocation();
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click + Escape.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Live unread notification count.
  useEffect(() => {
    getUnreadCount().then(setNotificationCount).catch(() => {});
    try {
      connect();
    } catch {
      return;
    }
    const unsub = onNotificationCount(({ count }) => setNotificationCount(count));
    return () => unsub();
  }, []);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <header className="sticky top-0 z-header border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/home" className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-full bg-gradient-brand shadow-brand">
              <Heart className="size-5 fill-current text-white" />
            </div>
            <span className="text-gradient-brand font-display text-2xl font-bold">
              iLike
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "text-brand"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  <span>{link.name}</span>
                  {active && (
                    <motion.span
                      layoutId={reduce ? undefined : "navbar-active"}
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand"
                      transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Bell className="size-5" />
              {notificationCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-brand text-xs font-semibold text-white nums-tabular">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
                className="flex cursor-pointer items-center gap-2 rounded-full p-1 pr-2 text-muted-foreground transition-colors hover:bg-accent"
              >
                <Avatar name={user?.name} size="sm" />
                <span className="hidden font-medium text-foreground sm:block">
                  {user?.name || "User"}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    isProfileOpen && "rotate-180"
                  )}
                />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    role="menu"
                    variants={popIn}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-lg"
                  >
                    <Link
                      to="/profile"
                      role="menuitem"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <User className="size-4" /> View Profile
                    </Link>
                    <Link
                      to="/settings"
                      role="menuitem"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <Settings className="size-4" /> Settings
                    </Link>
                    <hr className="my-1 border-border" />
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      role="menuitem"
                      className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <LogOut className="size-4" /> Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <BottomNav />
    </header>
  );
};

export default Navbar;
