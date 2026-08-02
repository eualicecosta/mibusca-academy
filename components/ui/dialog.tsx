"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { isThemeSelectEventTarget } from "@/components/ui/theme-select";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm", className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

function shouldIgnoreOutside(target: EventTarget | null) {
  if (isThemeSelectEventTarget(target)) return true;
  if (!(target instanceof Element)) return false;
  // Native form controls and our floating menus
  return Boolean(
    target.closest(
      "input, textarea, select, label, [role='listbox'], [role='menu'], [data-radix-select-content], [data-radix-popper-content-wrapper]"
    )
  );
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, onPointerDownOutside, onInteractOutside, onFocusOutside, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-[100] grid w-[calc(100vw-2rem)] max-h-[min(92dvh,900px)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg border border-white/10 bg-[#151019] p-4 text-[#F5F3F3] shadow-2xl outline-none",
        className
      )}
      onPointerDownOutside={(event) => {
        if (shouldIgnoreOutside(event.target)) {
          event.preventDefault();
        }
        onPointerDownOutside?.(event);
      }}
      onInteractOutside={(event) => {
        if (shouldIgnoreOutside(event.target)) {
          event.preventDefault();
        }
        onInteractOutside?.(event);
      }}
      onFocusOutside={(event) => {
        if (shouldIgnoreOutside(event.target)) {
          event.preventDefault();
        }
        onFocusOutside?.(event);
      }}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-3 rounded-lg p-2 text-white/55 hover:bg-white/10 hover:text-white">
        <X className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-bold", className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger };
