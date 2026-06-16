import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-9 text-sm",
  md: "size-12 text-lg",
  lg: "size-14 text-xl",
} as const;

const DOT = {
  sm: "size-2.5",
  md: "size-3.5",
  lg: "size-4",
} as const;

/**
 * Avatar — image with a gradient initials fallback and an optional online dot.
 * Reused across chat, profile, and match surfaces.
 */
export function Avatar({
  src,
  name,
  size = "md",
  online,
  className,
}: {
  src?: string | null;
  name?: string;
  size?: keyof typeof SIZES;
  online?: boolean;
  className?: string;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "grid place-items-center overflow-hidden rounded-full bg-gradient-brand font-display font-bold text-white",
          SIZES[size]
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
          <span aria-hidden="true">{initial}</span>
        )}
      </div>
      {online && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full bg-like ring-2 ring-background",
            DOT[size]
          )}
          aria-label="Online"
          role="img"
        />
      )}
    </div>
  );
}
