import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome, {user.name ?? user.email}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>You are signed in</CardTitle>
          <CardDescription>
            This page is only reachable with a valid session.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Documents, recent conversations and usage arrive with the dashboard in
          Phase 3.
        </CardContent>
      </Card>
    </div>
  );
}
