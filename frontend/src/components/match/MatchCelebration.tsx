import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { User } from "@/services/matchService";

interface MatchCelebrationProps {
  open: boolean;
  currentUser: { name?: string; avatar?: string | null };
  matchedUser: User | null;
  onClose: () => void;
  onSendMessage: () => void;
}

/** Deterministic-ish spread of celebratory hearts for the burst. */
function useHeartParticles(count = 16) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 320, // horizontal drift
        y: -(80 + Math.random() * 260), // float upward
        scale: 0.5 + Math.random() * 1.1,
        rotate: (Math.random() - 0.5) * 90,
        delay: Math.random() * 0.35,
        duration: 1.4 + Math.random() * 1.2,
        coral: i % 2 === 0,
      })),
    [count]
  );
}

function Avatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name?: string;
  className?: string;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <div
      className={cn(
        "grid size-28 place-items-center overflow-hidden rounded-full bg-muted ring-4 ring-white shadow-xl",
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={name ? `${name}'s photo` : "Profile photo"}
          className="size-full object-cover"
          draggable={false}
        />
      ) : (
        <span className="font-display text-4xl font-bold text-muted-foreground">
          {initial}
        </span>
      )}
    </div>
  );
}

export function MatchCelebration({
  open,
  currentUser,
  matchedUser,
  onClose,
  onSendMessage,
}: MatchCelebrationProps) {
  const reduce = useReducedMotion();
  const hearts = useHeartParticles();
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Esc to close + focus the primary CTA on open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => primaryRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && matchedUser && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="It's a match"
          className="fixed inset-0 z-modal flex flex-col items-center justify-center overflow-hidden px-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          {/* Backdrop: dark with a brand glow */}
          <div
            className="absolute inset-0 bg-black/85"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 38%, hsl(var(--brand) / 0.45), transparent 60%)",
            }}
          />

          {/* Heart particle burst */}
          {!reduce && (
            <div className="pointer-events-none absolute left-1/2 top-[42%] z-10">
              {hearts.map((h) => (
                <motion.div
                  key={h.id}
                  className={cn(
                    "absolute",
                    h.coral ? "text-coral" : "text-brand"
                  )}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    x: h.x,
                    y: h.y,
                    scale: h.scale,
                    rotate: h.rotate,
                  }}
                  transition={{
                    duration: h.duration,
                    delay: h.delay,
                    ease: "easeOut",
                    repeat: Infinity,
                    repeatDelay: 0.4,
                  }}
                >
                  <Heart className="size-5 fill-current" />
                </motion.div>
              ))}
            </div>
          )}

          {/* Content */}
          <motion.div
            className="relative z-20 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <motion.h2
              className="text-gradient-brand font-display text-5xl font-bold"
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.05 }}
            >
              It's a Match!
            </motion.h2>
            <p className="mt-2 text-white/85">
              You and {matchedUser.name} liked each other.
            </p>

            {/* Dual avatars + center heart */}
            <div className="relative mt-10 flex items-center justify-center">
              <motion.div
                initial={reduce ? false : { x: -120, rotate: -12, opacity: 0 }}
                animate={{ x: 0, rotate: -6, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
              >
                <Avatar src={currentUser.avatar} name={currentUser.name} />
              </motion.div>
              <motion.div
                className="-ml-6"
                initial={reduce ? false : { x: 120, rotate: 12, opacity: 0 }}
                animate={{ x: 0, rotate: 6, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
              >
                <Avatar
                  src={matchedUser.photos?.[0] ?? matchedUser.profilePicture}
                  name={matchedUser.name}
                />
              </motion.div>

              <motion.div
                className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                initial={reduce ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.35 }}
              >
                <div className="grid size-14 place-items-center rounded-full bg-gradient-brand shadow-brand">
                  <Heart className="size-7 fill-white text-white" />
                </div>
              </motion.div>
            </div>

            {/* CTAs */}
            <div className="mt-12 flex w-full max-w-xs flex-col gap-3">
              <Button
                ref={primaryRef}
                variant="brand"
                size="lg"
                className="w-full"
                onClick={onSendMessage}
              >
                <MessageCircle className="size-5" /> Send a message
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full border border-white/30 text-white hover:bg-white/15 hover:text-white"
                onClick={onClose}
              >
                Keep swiping
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
