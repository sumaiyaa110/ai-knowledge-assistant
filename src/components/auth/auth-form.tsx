"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendJson } from "@/lib/api/client";
import { loginSchema, registerSchema } from "@/models/auth";
import { z } from "zod";
import { FormField } from "./form-field";

type AuthFormProps = {
  mode: "login" | "register";
  /** Where to go after a successful sign-in. Already validated by the page. */
  redirectTo: string;
};

export function AuthForm({ mode, redirectTo }: AuthFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const isRegister = mode === "register";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));

    // Same schema as the server, so most mistakes are caught without a round trip.
    const parsed = (isRegister ? registerSchema : loginSchema).safeParse(values);
    if (!parsed.success) {
      setFormError(null);
      setFieldErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setPending(true);
    setFormError(null);
    setFieldErrors({});

    const result = await sendJson(`/api/auth/${mode}`, "POST", parsed.data);
    if (!result.ok) {
      setFieldErrors(result.fieldErrors);
      // A field-level message already explains the problem; don't repeat it.
      setFormError(Object.keys(result.fieldErrors).length ? null : result.error);
      setPending(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </p>
      )}

      {isRegister && (
        <FormField
          name="name"
          label="Name"
          autoComplete="name"
          errors={fieldErrors.name}
          disabled={pending}
        />
      )}
      <FormField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        errors={fieldErrors.email}
        disabled={pending}
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        autoComplete={isRegister ? "new-password" : "current-password"}
        hint={isRegister ? "At least 8 characters, with a letter and a number." : undefined}
        errors={fieldErrors.password}
        disabled={pending}
      />

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {isRegister
          ? pending ? "Creating account…" : "Create account"
          : pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? "Already have an account? " : "No account yet? "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {isRegister ? "Sign in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}
