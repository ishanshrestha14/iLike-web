import { motion, useReducedMotion } from "framer-motion";

/** Animated three-dot "typing…" bubble shown for the other participant. */
export function TypingIndicator() {
  const reduce = useReducedMotion();
  return (
    <div className="flex justify-start" aria-label="typing" role="status">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-card px-4 py-3 shadow-sm">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-2 rounded-full bg-muted-foreground/60"
            animate={reduce ? {} : { y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}
