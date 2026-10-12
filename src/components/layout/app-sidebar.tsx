import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

/** Fixed sidebar for md screens and up. Smaller screens use MobileNav. */
export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Brand />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <SidebarNav />
      </div>
      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        Runs locally. Your files stay on this machine.
      </p>
    </aside>
  );
}
