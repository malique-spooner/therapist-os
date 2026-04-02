import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], variable: '--font-display', weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: "Therapist OS",
  description: "Personal AI-powered psychological intelligence system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TherapistOS",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2D6A4F",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} ${cormorant.variable} font-[var(--font-inter)]`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
