import Link from "next/link";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SectionCardProps = {
  title: string;
  viewAll?: { label: string; href: string };
  children: React.ReactNode;
};

/** A titled dashboard panel with an optional "view all" link. */
export function SectionCard({ title, viewAll, children }: SectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {viewAll && (
          <CardAction>
            <Link
              href={viewAll.href}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {viewAll.label}
            </Link>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
