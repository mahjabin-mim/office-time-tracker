import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Office Time Tracker",
    short_name: "Time Tracker",
    description: "Track your daily entry and out time, and see your monthly balance at a glance.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f2f1ff",
    theme_color: "#5f3dff",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
