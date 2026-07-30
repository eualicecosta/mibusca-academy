"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function MobileCourseNav({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-center">
          <Menu className="h-4 w-4" />
          Modulos e aulas
        </Button>
      </DialogTrigger>
      <DialogContent className="left-0 top-0 h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none p-4 sm:left-auto sm:right-0 sm:w-[420px]">
        <DialogTitle className="pr-10">Modulos e aulas</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
