"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendJson } from "@/lib/api/client";
import { FormField } from "./form-field";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));

    setPending(true);
    setMessage(null);
    const result = await sendJson("/api/auth/me", "PATCH", { name: values.name });
    setPending(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors);
      setMessage(
        Object.keys(result.fieldErrors).length ? null : { ok: false, text: result.error },
      );
      return;
    }
    setFieldErrors({});
    setMessage({ ok: true, text: "Profile saved" });
    router.refresh(); // re-render the header with the new name
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField name="email" label="Email" type="email" value={email} readOnly disabled />
      <FormField
        name="name"
        label="Name"
        defaultValue={name}
        autoComplete="name"
        errors={fieldErrors.name}
        disabled={pending}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
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
