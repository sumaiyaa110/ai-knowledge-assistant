import { DatabaseZap } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ProblemScreen } from "@/components/layout/problem-screen";
import { requireUser } from "@/lib/auth/session";
import { isDatabaseUnavailable } from "@/lib/database/errors";
import type { SessionUser } from "@/models/auth";

// Everything under (app) requires a signed-in user. Middleware already
// redirects anonymous visitors; requireUser() also checks the database.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user: SessionUser;
  try {
    user = await requireUser();
  } catch (error) {
    // Anything else (including the redirect requireUser() throws for signed-out
    // visitors) must continue on its way.
    if (!isDatabaseUnavailable(error)) throw error;

    // Without the database nothing in the app can be shown, so say so plainly
    // instead of falling through to a generic error page.
    return (
      <ProblemScreen
        icon={DatabaseZap}
        title="The database is not reachable"
        description="The app could not connect to PostgreSQL. Your documents and chats are safe; they will be back as soon as the database is running again. Reload this page afterwards."
        steps={["Start Docker Desktop and wait for it to be ready", "npm run db:up"]}
      />
    );
  }

  return (
    <div className="flex min-h-dvh">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader user={user} />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
