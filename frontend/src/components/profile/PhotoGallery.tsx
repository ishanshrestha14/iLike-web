import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

interface PhotoGalleryProps {
  photos: string[];
  alt?: string;
  className?: string;
}

/**
 * Premium photo carousel: a large main image with AnimatePresence slide/fade,
 * prev/next + swipe + arrow-key nav, dot indicators, and a thumbnail strip.
 * Reduced-motion aware; falls back to a graceful empty state.
 */
export function PhotoGallery({ photos, alt = "Photo", className }: PhotoGalleryProps) {
  const reduce = useReducedMotion();
  const [[index, dir], setState] = useState<[number, number]>([0, 0]);

  if (!photos || photos.length === 0) {
    return (
      <div
        className={cn(
          "flex aspect-[4/5] w-full flex-col items-center justify-center rounded-2xl bg-muted text-muted-foreground",
          className
        )}
      >
        <ImageOff className="size-10" />
        <p className="mt-2 text-sm">No photos yet</p>
      </div>
    );
  }

  const count = photos.length;
  const go = (to: number, d: number) =>
    setState([(to + count) % count, d]);
  const prev = () => go(index - 1, -1);
  const next = () => go(index + 1, 1);

  const variants = {
    enter: (d: number) => ({ x: reduce ? 0 : d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: reduce ? 0 : d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted shadow-sm"
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Photo gallery"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") prev();
          if (e.key === "ArrowRight") next();
        }}
      >
        <AnimatePresence initial={false} custom={dir}>
          <motion.img
            key={index}
            src={photos[index]}
            alt={`${alt} ${index + 1} of ${count}`}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag={count > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) next();
              else if (info.offset.x > 80) prev();
            }}
            className="absolute inset-0 size-full touch-pan-y object-cover"
            draggable={false}
          />
        </AnimatePresence>

        {count > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 z-10 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-background/70 text-foreground opacity-0 backdrop-blur transition-opacity hover:bg-background focus-visible:opacity-100 group-hover:opacity-100"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={next}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 z-10 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-background/70 text-foreground opacity-0 backdrop-blur transition-opacity hover:bg-background focus-visible:opacity-100 group-hover:opacity-100"
            >
              <ChevronRight className="size-5" />
            </button>
            <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((url, i) => (
            <button
              key={i}
              onClick={() => go(i, i > index ? 1 : -1)}
              aria-label={`View photo ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-2 transition",
                i === index ? "ring-brand" : "ring-transparent hover:ring-border"
              )}
            >
              <img
                src={url}
                alt=""
                className="size-full object-cover"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
