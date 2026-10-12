import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { requireUser } from "@/lib/auth/session";

// Everything under (app) requires a signed-in user. Middleware already
// redirects anonymous visitors; requireUser() also checks the database.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
        <nav className="flex min-w-0 items-center gap-4 text-sm">
          <Link href="/dashboard" className="truncate font-semibold">
            AI Knowledge Assistant
          </Link>
          <Link
            href="/dashboard"
            className="hidden text-muted-foreground hover:text-foreground sm:inline"
          >
            Dashboard
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/profile"
            className="max-w-40 truncate text-sm text-muted-foreground hover:text-foreground"
          >
            {user.name ?? user.email}
          </Link>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
