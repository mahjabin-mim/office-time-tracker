"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "@/components/dashboard/Sidebar";

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-brand-600 dark:text-brand-400" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="tabbar-active"
                  className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-brand-600 dark:bg-brand-400"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon className={cn("h-5 w-5 transition-transform duration-300", active && "-translate-y-0.5 scale-110")} />
              {item.shortLabel}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
