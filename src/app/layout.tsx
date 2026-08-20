import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Office Time Tracker",
  description: "Track your daily entry and out time, and see your monthly balance at a glance.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Time Tracker",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#5f3dff",
  width: "device-width",
  initialScale: 1,
};

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("ott-theme");
    var theme = stored || "system";
    var isDark =
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
