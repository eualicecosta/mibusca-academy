import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-[var(--radius)] px-4 py-2 text-center text-sm font-semibold transition-[background-color,border-color,box-shadow,transform,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md shadow-[var(--primary)]/25 hover:bg-[var(--primary-hover)]",
        secondary:
          "border border-[var(--border)] bg-white/[0.06] text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-white/[0.1]",
        ghost: "text-[var(--muted-foreground)] hover:bg-white/[0.06] hover:text-[var(--foreground)]",
        destructive: "bg-[var(--destructive)] text-white hover:bg-red-400",
        outline:
          "border border-[var(--secondary)]/55 text-[var(--foreground)] hover:border-[var(--secondary)] hover:bg-[var(--secondary)]/12"
      },
      size: {
        default: "h-11",
        sm: "h-9 min-h-9 px-3 text-xs",
        lg: "h-12 min-h-12 px-6"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
