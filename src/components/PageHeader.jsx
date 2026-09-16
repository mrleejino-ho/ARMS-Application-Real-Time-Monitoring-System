export default function PageHeader({
  title,
  description,
}) {
  return (
    <section>
      <p className="text-sm text-neutral-500">
        ARMS
      </p>

      <h1 className="mt-1 text-3xl font-bold tracking-tight">
        {title}
      </h1>

      <p className="mt-2 max-w-2xl text-sm text-neutral-400">
        {description}
      </p>
    </section>
  );
}