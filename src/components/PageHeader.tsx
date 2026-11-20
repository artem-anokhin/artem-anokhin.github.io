export function PageHeader({ title, accent, lead }: { title: string; accent?: string; lead?: string }) {
  return (
    <header className="mb-6">
      <h1 className="title text-3xl md:text-4xl">
        {title}
        {accent && <span className="block text-accent">{accent}</span>}
      </h1>
      {lead && <p className="mt-3 text-muted">{lead}</p>}
    </header>
  );
}
