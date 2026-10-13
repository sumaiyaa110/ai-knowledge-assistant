import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { ProblemScreen } from "@/components/layout/problem-screen";
import { buttonVariants } from "@/components/ui/button";

// Shown inside the app shell when a document, chat or study set does not
// exist or belongs to someone else.
export default function AppNotFound() {
  return (
    <ProblemScreen
      icon={FileQuestion}
      title="Not found"
      description="This item does not exist or has been deleted."
    >
      <Link href="/dashboard" className={buttonVariants()}>
        Go to dashboard
      </Link>
      <Link href="/documents" className={buttonVariants({ variant: "outline" })}>
        Your documents
      </Link>
    </ProblemScreen>
  );
}
