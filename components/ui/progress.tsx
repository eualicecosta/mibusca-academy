import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({
  className,
  value,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value?: number | null }) {
  const normalizedValue = Math.max(0, Math.min(100, value || 0));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={normalizedValue}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-white/10", className)}
      {...props}
    >
      <div
        className="h-full w-full flex-1 rounded-full bg-gradient-to-r from-[#53009F] to-[#8A1DEE] transition-transform"
        style={{ transform: `translateX(-${100 - normalizedValue}%)` }}
      />
    </div>
  );
}
