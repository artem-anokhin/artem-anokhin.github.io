export function PageHeader({
  title,
  accent,
  lead,
  action,
}: {
  title: string;
  accent?: string;
  lead?: string;
  /** Optional control shown to the right of the title (e.g. a settings link). */
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="title text-3xl md:text-4xl">
          {title}
          {accent && <span className="block text-accent">{accent}</span>}
        </h1>
        {action}
      </div>
      {lead && <p className="mt-3 text-muted">{lead}</p>}
    </header>
  );
}
