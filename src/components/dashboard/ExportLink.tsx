import { Download } from "lucide-react";

export function ExportLink({ href, label = "Export CSV" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium shadow-soft transition-all hover:-translate-y-0.5 hover:bg-muted active:translate-y-0"
    >
      <Download className="h-4 w-4" />
      {label}
    </a>
  );
}
