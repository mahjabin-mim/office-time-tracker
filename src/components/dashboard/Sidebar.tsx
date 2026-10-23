"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Clock3, LayoutDashboard, CalendarRange, ChartColumnBig, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { logoutAction } from "@/lib/actions/auth";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Today", icon: LayoutDashboard },
  { href: "/dashboard/monthly", label: "Monthly Summary", shortLabel: "Monthly", icon: CalendarRange },
  { href: "/dashboard/yearly", label: "Yearly Overview", shortLabel: "Yearly", icon: ChartColumnBig },
  { href: "/dashboard/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];

function SidebarContent() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 pb-6 pt-6">
        <div className="bg-brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-glow">
          <Clock3 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Office Time</p>
          <p className="text-xs leading-tight text-muted-foreground">Tracker</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="bg-brand-gradient absolute inset-0 rounded-xl shadow-glow"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <form action={logoutAction} className="border-t border-border p-3">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </form>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card/70 backdrop-blur-xl lg:block">
      <div className="sticky top-0 h-screen">
        <SidebarContent />
      </div>
    </aside>
  );
}
