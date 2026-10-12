"use client";

import { History } from "lucide-react";
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
import { ConversationList } from "./conversation-list";

/** Opens the conversation list in a drawer on screens too narrow for the chat sidebar. */
export function MobileConversations() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open conversations" />
        }
      >
        <History />
      </SheetTrigger>
      <SheetContent side="right" className="gap-0 bg-sidebar p-0 data-[side=right]:w-80">
        <SheetHeader className="h-14 justify-center border-b">
          <SheetTitle>Conversations</SheetTitle>
          <SheetDescription className="sr-only">Your previous chats</SheetDescription>
        </SheetHeader>
        <ConversationList onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
