"use client";

import { RouteError } from "@/components/layout/route-error";

export default function AppError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} home={{ href: "/dashboard", label: "Go to dashboard" }} />;
}
