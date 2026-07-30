"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Checkbox({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer h-5 w-5 shrink-0 rounded border border-[#8A1DEE]/70 bg-transparent ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1DEE] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#8A1DEE] data-[state=checked]:text-[#F5F3F3]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
