"use client";

import { RouteError } from "@/components/layout/route-error";

export default function RootError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} home={{ href: "/", label: "Go to start page" }} />;
}
