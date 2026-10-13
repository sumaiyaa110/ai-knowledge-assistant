import { Loader2 } from "lucide-react";

export default function ChatLoading() {
  return (
    <div className="flex flex-1 items-center justify-center" role="status" aria-label="Loading chat">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}
