import { BookOpenText } from "lucide-react";
import Link from "next/link";

export function Brand({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold">
      <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/75 text-primary-foreground shadow-sm">
        <BookOpenText className="size-4" />
      </span>
      <span className="truncate">Knowledge Assistant</span>
    </Link>
  );
}
