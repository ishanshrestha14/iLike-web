import { cn } from "@/lib/utils";

/**
 * Skeleton placeholder with a moving shimmer (uses the `shimmer` animation
 * from the design tokens). Reserve space for async content to avoid layout jank.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-gradient-to-r before:from-transparent before:via-foreground/10 before:to-transparent",
        "before:animate-shimmer",
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
