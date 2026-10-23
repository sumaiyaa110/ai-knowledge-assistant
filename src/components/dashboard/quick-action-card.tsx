import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

type QuickActionCardProps = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export function QuickActionCard({ title, description, href, icon: Icon }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors outline-none hover:border-primary/30 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
