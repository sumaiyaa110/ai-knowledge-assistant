"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { sendJson } from "@/lib/api/client";
import { changePasswordSchema } from "@/models/auth";
import { FormField } from "./form-field";

export function PasswordForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = changePasswordSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      setMessage(null);
      setFieldErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setPending(true);
    setMessage(null);
    setFieldErrors({});
    const result = await sendJson("/api/auth/password", "POST", parsed.data);
    setPending(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors);
      setMessage(
        Object.keys(result.fieldErrors).length ? null : { ok: false, text: result.error },
      );
      return;
    }
    form.reset();
    setMessage({ ok: true, text: "Password changed. Other devices were signed out." });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField
        name="currentPassword"
        label="Current password"
        type="password"
        autoComplete="current-password"
        errors={fieldErrors.currentPassword}
        disabled={pending}
      />
      <FormField
        name="newPassword"
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters, with a letter and a number."
        errors={fieldErrors.newPassword}
        disabled={pending}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Updating…" : "Change password"}
        </Button>
        {message && (
          <p
            role="status"
            className={`text-sm ${message.ok ? "text-muted-foreground" : "text-destructive"}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
