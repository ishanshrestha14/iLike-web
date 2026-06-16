import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { Info, MapPin, X } from "lucide-react";

import type { User } from "@/services/matchService";
import { cn } from "@/lib/utils";

export type SwipeDirection = "left" | "right";

export interface SwipeCardHandle {
  /** Programmatically fling the card (used by the action bar + keyboard). */
  swipe: (dir: SwipeDirection) => void;
}

interface SwipeCardProps {
  user: User;
  /** Only the top card is interactive (draggable, tappable). */
  active: boolean;
  /** 0 = top of the stack; higher = further back. */
  stackIndex: number;
  onSwipe: (dir: SwipeDirection) => void;
}

const SWIPE_THRESHOLD = 110; // px of horizontal travel to commit
const VELOCITY_THRESHOLD = 500; // px/s flick to commit

export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(
  ({ user, active, stackIndex, onSwipe }, ref) => {
    const reduce = useReducedMotion();

    const x = useMotionValue(0);
    const rotate = useTransform(x, [-220, 220], [-16, 16]);
    const likeOpacity = useTransform(x, [40, 130], [0, 1]);
    const nopeOpacity = useTransform(x, [-130, -40], [1, 0]);

    const [photoIndex, setPhotoIndex] = useState(0);
    const [expanded, setExpanded] = useState(false);

    const photos =
      user.photos && user.photos.length
        ? user.photos
        : user.profilePicture
          ? [user.profilePicture]
          : [];
    const photoCount = photos.length;

    const leave = useCallback(
      (dir: SwipeDirection) => {
        if (reduce) {
          onSwipe(dir);
          return;
        }
        const width = typeof window !== "undefined" ? window.innerWidth : 800;
        animate(x, (dir === "right" ? 1 : -1) * (width * 1.1), {
          duration: 0.35,
          ease: [0.16, 1, 0.3, 1],
          onComplete: () => onSwipe(dir),
        });
      },
      [onSwipe, reduce, x]
    );

    useImperativeHandle(ref, () => ({ swipe: leave }), [leave]);

    const nextPhoto = () =>
      photoCount > 1 && setPhotoIndex((p) => (p + 1) % photoCount);
    const prevPhoto = () =>
      photoCount > 1 && setPhotoIndex((p) => (p - 1 + photoCount) % photoCount);

    // Depth for stacked (non-top) cards.
    const scale = 1 - stackIndex * 0.05;
    const y = stackIndex * 14;

    const hasDetails = Boolean(user.bio) || (user.interests?.length ?? 0) > 3;

    return (
      <motion.div
        className="absolute inset-0 touch-none select-none"
        style={active ? { x, rotate, zIndex: 30 } : { zIndex: 30 - stackIndex }}
        initial={false}
        animate={{ scale, y, opacity: stackIndex > 2 ? 0 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        drag={active ? "x" : false}
        dragElastic={0.6}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          if (!active) return;
          const { offset, velocity } = info;
          if (offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD) {
            leave("right");
          } else if (
            offset.x < -SWIPE_THRESHOLD ||
            velocity.x < -VELOCITY_THRESHOLD
          ) {
            leave("left");
          } else {
            animate(x, 0, { type: "spring", stiffness: 500, damping: 32 });
          }
        }}
        role="group"
        aria-label={`Profile of ${user.name}${user.age ? `, age ${user.age}` : ""}`}
      >
        <div className="relative h-full w-full overflow-hidden rounded-3xl bg-muted shadow-xl">
          {/* Photo */}
          {photoCount > 0 ? (
            <img
              src={photos[photoIndex]}
              alt={`${user.name}, photo ${photoIndex + 1} of ${photoCount}`}
              className="h-full w-full object-cover"
              draggable={false}
              loading={active ? "eager" : "lazy"}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
              No photo available
            </div>
          )}

          {/* Photo progress segments */}
          {photoCount > 1 && (
            <div className="absolute inset-x-3 top-3 z-20 flex gap-1.5">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    i === photoIndex ? "bg-white" : "bg-white/40"
                  )}
                />
              ))}
            </div>
          )}

          {/* Tap zones for photo navigation (top card only) */}
          {active && photoCount > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={prevPhoto}
                className="absolute left-0 top-0 z-10 h-full w-1/3 cursor-default focus:outline-none"
              />
              <button
                type="button"
                aria-label="Next photo"
                onClick={nextPhoto}
                className="absolute right-0 top-0 z-10 h-full w-1/3 cursor-default focus:outline-none"
              />
            </>
          )}

          {/* LIKE / NOPE drag stamps */}
          {active && (
            <>
              <motion.div
                style={{ opacity: likeOpacity }}
                className="pointer-events-none absolute left-5 top-8 z-20 -rotate-[18deg] rounded-xl border-4 border-like px-4 py-1 font-display text-3xl font-bold uppercase tracking-wider text-like"
              >
                Like
              </motion.div>
              <motion.div
                style={{ opacity: nopeOpacity }}
                className="pointer-events-none absolute right-5 top-8 z-20 rotate-[18deg] rounded-xl border-4 border-nope px-4 py-1 font-display text-3xl font-bold uppercase tracking-wider text-nope"
              >
                Nope
              </motion.div>
            </>
          )}

          {/* Bottom scrim + info */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-5 pt-20 text-white">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-3xl font-bold leading-tight drop-shadow-sm">
                  {user.name}
                  {user.age ? (
                    <span className="font-medium"> {user.age}</span>
                  ) : null}
                </h2>
                {user.distance && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-white/85">
                    <MapPin className="size-4" />
                    {user.distance}
                  </p>
                )}
                {user.interests?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {user.interests.slice(0, 3).map((it) => (
                      <span
                        key={it}
                        className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm"
                      >
                        {it}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {hasDetails && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  aria-label="View profile details"
                  className="pointer-events-auto grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-white/20 backdrop-blur-sm transition-colors hover:bg-white/30"
                >
                  <Info className="size-5" />
                </button>
              )}
            </div>
          </div>

          {/* Expandable details sheet */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
                className="absolute inset-0 z-30 flex flex-col bg-background/95 p-6 backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl font-bold">
                    {user.name}
                    {user.age ? `, ${user.age}` : ""}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    aria-label="Close details"
                    className="grid size-9 cursor-pointer place-items-center rounded-full bg-muted transition-colors hover:bg-accent"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                {user.bio && (
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {user.bio}
                  </p>
                )}
                {user.interests?.length ? (
                  <div className="mt-6">
                    <h4 className="font-display text-sm font-semibold">
                      Interests
                    </h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {user.interests.map((it) => (
                        <span
                          key={it}
                          className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                        >
                          {it}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }
);

SwipeCard.displayName = "SwipeCard";
