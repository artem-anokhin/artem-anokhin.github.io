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
        <div>
          {accent && <p className="text-[13px] font-semibold text-muted uppercase">{accent}</p>}
          <h1 className="title text-[34px]">{title}</h1>
        </div>
        {action}
      </div>
      {lead && <p className="mt-2 text-[17px] text-muted">{lead}</p>}
    </header>
  );
}
