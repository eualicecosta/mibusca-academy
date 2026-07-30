import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-center text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1DEE] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#53009F] text-[#F5F3F3] hover:bg-[#8A1DEE]",
        secondary: "border border-white/10 bg-white/8 text-[#F5F3F3] hover:bg-white/12",
        ghost: "text-[#F5F3F3]/70 hover:bg-white/8 hover:text-[#F5F3F3]",
        destructive: "bg-red-500 text-white hover:bg-red-400",
        outline: "border border-[#8A1DEE]/60 text-[#F5F3F3] hover:bg-[#8A1DEE]/15"
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6"
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
