export function Placeholder({ text }: { text: string }) {
  return (
    <section className="card p-6">
      <p className="text-muted">{text}</p>
    </section>
  );
}
