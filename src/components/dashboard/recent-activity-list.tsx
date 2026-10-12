import { Activity, FileUp, MessageSquarePlus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/format";
import type { ActivityItem, ActivityType } from "@/models/dashboard";
import { EmptyState } from "./empty-state";

const ACTIVITY_META: Record<ActivityType, { icon: LucideIcon; verb: string }> = {
  document_uploaded: { icon: FileUp, verb: "Uploaded" },
  conversation_started: { icon: MessageSquarePlus, verb: "Started chat" },
};

export function RecentActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="Nothing here yet"
        description="Uploads and new chats will be listed here as you use the app."
      />
    );
  }

  return (
    <ol className="space-y-4">
      {items.map((item) => {
        const { icon: Icon, verb } = ACTIVITY_META[item.type];
        return (
          <li key={item.id} className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-3.5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <span className="text-muted-foreground">{verb} </span>
                <Link href={item.href} className="font-medium hover:underline">
                  {item.title}
                </Link>
              </p>
              <p className="text-xs text-muted-foreground">{formatRelativeTime(item.at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
