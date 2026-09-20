export default function PageHeader({
  title,
  description,
}) {
  return (
    <section className="arms-page-header">
      <p className="text-sm font-semibold text-[#1976D2]">
        ARMS / Workspace
      </p>

      <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#123B5D]">
        {title}
      </h1>

      <p className="mt-2 max-w-2xl text-sm text-slate-500">
        {description}
      </p>
    </section>
  );
}