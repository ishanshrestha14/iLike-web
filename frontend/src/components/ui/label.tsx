import * as React from "react";

import { cn } from "@/lib/utils";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

/**
 * Token-styled form label. Plain <label> (no Radix dependency); dims when the
 * associated control is disabled via the `peer-disabled` pattern.
 */
const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };
