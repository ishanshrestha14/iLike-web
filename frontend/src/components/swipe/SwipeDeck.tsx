import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Heart, RotateCcw, X } from "lucide-react";

import type { User } from "@/services/matchService";
import { cn } from "@/lib/utils";
import { SwipeCard, type SwipeCardHandle, type SwipeDirection } from "./SwipeCard";

interface SwipeDeckProps {
  /** Remaining users, top of the deck first. */
  users: User[];
  /** Fired when the top card is swiped (drag, button, or keyboard). */
  onSwipe: (user: User, dir: SwipeDirection) => void;
  onRewind?: () => void;
  rewindDisabled?: boolean;
}

const MAX_VISIBLE = 3;

export function SwipeDeck({
  users,
  onSwipe,
  onRewind,
  rewindDisabled,
}: SwipeDeckProps) {
  const activeRef = useRef<SwipeCardHandle>(null);
  const visible = users.slice(0, MAX_VISIBLE);
  const top = visible[0];

  const handleSwipe = useCallback(
    (dir: SwipeDirection) => {
      if (top) onSwipe(top, dir);
    },
    [top, onSwipe]
  );

  // Keyboard: ← Nope, → Like, Backspace/Z Rewind.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowLeft") activeRef.current?.swipe("left");
      else if (e.key === "ArrowRight") activeRef.current?.swipe("right");
      else if (
        (e.key === "Backspace" || e.key.toLowerCase() === "z") &&
        !rewindDisabled
      ) {
        e.preventDefault();
        onRewind?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rewindDisabled, onRewind]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center">
      <div className="relative aspect-[3/4] w-full">
        {visible.map((user, i) => (
          <SwipeCard
            key={user.id}
            ref={i === 0 ? activeRef : undefined}
            user={user}
            active={i === 0}
            stackIndex={i}
            onSwipe={i === 0 ? handleSwipe : () => {}}
          />
        ))}
      </div>

      {/* Action bar */}
      <div className="mt-6 flex items-center justify-center gap-5">
        <ActionButton
          label="Nope"
          size="lg"
          className="text-nope"
          onClick={() => activeRef.current?.swipe("left")}
        >
          <X className="size-7" />
        </ActionButton>
        <ActionButton
          label="Rewind last swipe"
          size="md"
          className="text-cta"
          disabled={rewindDisabled}
          onClick={() => onRewind?.()}
        >
          <RotateCcw className="size-5" />
        </ActionButton>
        <ActionButton
          label="Like"
          size="lg"
          className="text-like"
          onClick={() => activeRef.current?.swipe("right")}
        >
          <Heart className="size-7" />
        </ActionButton>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  label,
  onClick,
  disabled,
  className,
  size = "lg",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.06 }}
      transition={{ type: "spring", stiffness: 500, damping: 24 }}
      className={cn(
        "grid cursor-pointer place-items-center rounded-full bg-card shadow-lg ring-1 ring-border",
        "transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-40",
        size === "lg" ? "size-16" : "size-12",
        className
      )}
    >
      {children}
    </motion.button>
  );
}
