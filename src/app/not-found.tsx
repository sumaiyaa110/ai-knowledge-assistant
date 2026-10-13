import { FileQuestion } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProblemScreen } from "@/components/layout/problem-screen";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <ProblemScreen
      icon={FileQuestion}
      title="Page not found"
      description="This page does not exist, or it was deleted. Documents, chats and study sets disappear from their links once they are removed."
    >
      <Link href="/dashboard" className={buttonVariants()}>
        Go to dashboard
      </Link>
    </ProblemScreen>
  );
}
