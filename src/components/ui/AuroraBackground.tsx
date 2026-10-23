/** Soft, slowly drifting colour blobs behind the app. Pure CSS, so it costs no JavaScript. */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-[10%] -top-[20%] h-[55vh] w-[55vw] animate-drift rounded-full bg-[hsl(var(--aurora-1)/0.16)] blur-3xl dark:bg-[hsl(var(--aurora-1)/0.22)]" />
      <div className="absolute -right-[15%] top-[10%] h-[50vh] w-[45vw] animate-drift-slow rounded-full bg-[hsl(var(--aurora-2)/0.12)] blur-3xl dark:bg-[hsl(var(--aurora-2)/0.16)]" />
      <div className="absolute -bottom-[25%] left-[25%] h-[50vh] w-[50vw] animate-drift rounded-full bg-[hsl(var(--aurora-3)/0.1)] blur-3xl [animation-delay:-12s] dark:bg-[hsl(var(--aurora-3)/0.12)]" />
    </div>
  );
}
