import Link from "next/link";

export function Breadcrumbs({ items }: { items: { name: string; path?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-[13px] text-ink-3">
        {items.map((it, i) => (
          <li key={it.name} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {it.path ? (
              <Link href={it.path} className="text-ink-2 no-underline hover:text-ink">
                {it.name}
              </Link>
            ) : (
              <span aria-current="page">{it.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
