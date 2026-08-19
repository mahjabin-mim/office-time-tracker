"use client";

import { motion } from "framer-motion";

export function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl"
        animate={{ x: [0, 40, -10, 0], y: [0, 30, -20, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl"
        animate={{ x: [0, -30, 20, 0], y: [0, -25, 15, 0], scale: [1, 0.94, 1.06, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-300/10 blur-3xl"
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.12, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
