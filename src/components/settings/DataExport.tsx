import { Download, FileJson, FileSpreadsheet } from "lucide-react";

const OPTIONS = [
  {
    href: "/api/export?format=csv",
    icon: FileSpreadsheet,
    title: "Attendance history (CSV)",
    description: "Every day since you joined. Opens in Excel or Google Sheets.",
  },
  {
    href: "/api/export?format=json",
    icon: FileJson,
    title: "Full backup (JSON)",
    description: "Your profile, working schedule, and all attendance records.",
  },
];

export function DataExport() {
  return (
    <div className="space-y-3">
      {OPTIONS.map(({ href, icon: Icon, title, description }) => (
        <a
          key={href}
          href={href}
          className="group flex items-center gap-3 rounded-xl border border-border px-3.5 py-3 transition-colors hover:border-brand-600/40 hover:bg-muted/40"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600 dark:text-brand-400">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Download className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-y-0.5 group-hover:text-foreground" />
        </a>
      ))}
    </div>
  );
}
