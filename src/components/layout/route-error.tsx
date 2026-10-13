"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProblemScreen } from "./problem-screen";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  /** Where the secondary button leads. */
  home: { href: string; label: string };
};

/** Shared body for the error.tsx boundaries. */
export function RouteError({ error, reset, home }: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ProblemScreen
      icon={TriangleAlert}
      title="This page could not be loaded"
      description="Something went wrong on the server. Trying again often helps; if it keeps happening, check that the database and Ollama are running."
    >
      <Button onClick={reset}>
        <RotateCw />
        Try again
      </Button>
      <Link href={home.href} className={buttonVariants({ variant: "outline" })}>
        {home.label}
      </Link>
      {error.digest && (
        <p className="basis-full text-xs text-muted-foreground">
          Reference for the server log: {error.digest}
        </p>
      )}
    </ProblemScreen>
  );
}
