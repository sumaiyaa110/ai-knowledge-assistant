"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

/** Hamburger button plus slide-in drawer, shown below the md breakpoint. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu" />
        }
      >
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="gap-0 bg-sidebar p-0 data-[side=left]:w-72">
        <SheetHeader className="h-14 justify-center border-b">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main application pages</SheetDescription>
          <Brand />
        </SheetHeader>
        <div className="p-3">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
