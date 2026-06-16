/**
 * Shared Framer Motion presets for the iLike design system.
 *
 * Centralising transitions + variants keeps micro-interactions consistent
 * (durations/easing mirror the CSS motion tokens in index.css) and makes it
 * trivial to honour `prefers-reduced-motion` everywhere.
 *
 * Usage:
 *   import { fadeInUp, springSnappy } from "@/lib/motion";
 *   <motion.div variants={fadeInUp} initial="hidden" animate="show" />
 */

import type { Transition, Variants } from "framer-motion";

/* ── Transition presets ─────────────────────────────────────────────────── */

/** Snappy spring — buttons, card snap-back, action feedback. */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 32,
  mass: 0.8,
};

/** Soft spring — entrances, layout transitions, modals. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 26,
};

/** Standard ease-out tween (~250ms) for fades and simple moves. */
export const easeOut: Transition = {
  duration: 0.25,
  ease: [0.16, 1, 0.3, 1],
};

/** Fast ease-out (~150ms) for hover/press micro-interactions. */
export const easeFast: Transition = {
  duration: 0.15,
  ease: [0.16, 1, 0.3, 1],
};

/* ── Variants ───────────────────────────────────────────────────────────── */

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: easeOut },
  exit: { opacity: 0, transition: easeFast },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: springSoft },
  exit: { opacity: 0, y: 8, transition: easeFast },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: springSoft },
  exit: { opacity: 0, scale: 0.96, transition: easeFast },
};

/** Modal/dialog content pop. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: springSnappy },
  exit: { opacity: 0, scale: 0.95, y: 8, transition: easeFast },
};

/**
 * Stagger container — pair with a child variant (e.g. fadeInUp) and set
 * `variants={staggerContainer}` on the parent.
 */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

/* ── Reduced-motion helpers ─────────────────────────────────────────────── */

/**
 * Returns reduced variants (opacity-only, no transforms) when the user prefers
 * reduced motion. Call with the live boolean from Framer's `useReducedMotion`.
 *
 *   const reduce = useReducedMotion();
 *   <motion.div variants={withReducedMotion(fadeInUp, reduce)} />
 */
export function withReducedMotion(variants: Variants, reduce: boolean | null): Variants {
  if (!reduce) return variants;
  return {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.001 } },
    exit: { opacity: 0, transition: { duration: 0.001 } },
  };
}

/** Common viewport config for scroll-reveal sections. */
export const revealViewport = { once: true, margin: "-80px" } as const;
