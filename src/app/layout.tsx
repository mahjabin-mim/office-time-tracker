import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { MotionProvider } from "@/components/MotionProvider";
import { Toaster } from "@/components/ui/Toaster";

// Fills the --font-sans variable that tailwind.config.ts's font stack starts with.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

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
  themeColor: "#6a2ff5",
  width: "device-width",
  initialScale: 1,
  // Lets the mobile tab bar pad itself above the iPhone home indicator.
  viewportFit: "cover",
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <MotionProvider>{children}</MotionProvider>
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
