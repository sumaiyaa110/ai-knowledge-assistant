import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/constants";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Accounts are stored in your local database only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm mode="register" redirectTo={DEFAULT_SIGNED_IN_PATH} />
      </CardContent>
    </Card>
  );
}
