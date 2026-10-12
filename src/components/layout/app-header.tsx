import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { getInitials } from "@/lib/format";
import type { SessionUser } from "@/models/auth";
import { MobileNav } from "./mobile-nav";
import { PageTitle } from "./page-title";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader({ user }: { user: SessionUser }) {
  const displayName = user.name ?? user.email;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      <MobileNav />
      <div className="min-w-0 flex-1">
        <PageTitle />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/profile"
          aria-label={`Profile: ${displayName}`}
          className="flex items-center gap-2 rounded-lg p-1 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 sm:pr-2"
        >
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
          >
            {getInitials(displayName)}
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block max-w-40 truncate text-sm leading-tight font-medium">
              {displayName}
            </span>
            {user.name && (
              <span className="block max-w-40 truncate text-xs leading-tight text-muted-foreground">
                {user.email}
              </span>
            )}
          </span>
        </Link>
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  );
}
