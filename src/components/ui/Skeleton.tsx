import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-lg bg-gradient-to-r from-muted via-card/80 to-muted bg-[length:200%_100%]",
        className
      )}
    />
  );
}
