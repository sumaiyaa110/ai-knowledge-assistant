import { ConversationList } from "@/components/chat/conversation-list";
import { ConversationsProvider } from "@/components/chat/conversations-context";
import { requireUser } from "@/lib/auth/session";
import { listConversations } from "@/lib/chat/service";

// Chat needs the full height below the header, with its own scrolling
// regions, so it is positioned over the padded page area of the app layout:
// below the 3.5rem header, and right of the 15rem sidebar from md up.
export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const conversations = await listConversations(user.id);

  return (
    <ConversationsProvider conversations={conversations}>
      <div className="fixed inset-x-0 top-14 bottom-0 z-10 flex bg-background md:left-60">
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">
          <ConversationList />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </ConversationsProvider>
  );
}
