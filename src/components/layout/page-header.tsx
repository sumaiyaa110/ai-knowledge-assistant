type PageHeaderProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

/** Title row at the top of a page, with optional actions on the right. */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}
