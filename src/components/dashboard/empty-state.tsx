import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-8 text-center", className)}>
      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10">
        <Icon className="size-5 text-primary" />
      </span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      {action && (
        <Link
          href={action.href}
          className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
