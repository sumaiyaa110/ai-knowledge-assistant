import type { Metadata } from "next";
import { PasswordForm } from "@/components/auth/password-form";
import { ProfileForm } from "@/components/auth/profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [documents, conversations] = await Promise.all([
    prisma.document.count({ where: { userId: user.id } }),
    prisma.conversation.count({ where: { userId: user.id } }),
  ]);

  const stats = [
    {
      label: "Member since",
      value: user.createdAt.toLocaleDateString("en", { dateStyle: "medium" }),
    },
    { label: "Documents", value: documents },
    { label: "Conversations", value: conversations },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card px-4 py-3">
            <dt className="text-sm text-muted-foreground">{stat.label}</dt>
            <dd className="mt-1 text-lg font-medium">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>Your email is your sign-in and cannot be changed.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm name={user.name ?? ""} email={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Changing it signs out every other device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
