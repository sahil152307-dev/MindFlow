import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "MindFlow · Adaptive Student Planner",
  description:
    "An empathetic planner for students with ADHD, anxiety and executive dysfunction. Energy-aware task sequencing, gentle rollovers, and shame-free progress.",
  keywords: [
    "MindFlow",
    "adaptive planner",
    "ADHD",
    "executive dysfunction",
    "student planner",
    "spoon theory",
  ],
  authors: [{ name: "MindFlow" }],
  icons: {
    icon: "/mindflow-icon.svg",
  },
  openGraph: {
    title: "MindFlow · Adaptive Student Planner",
    description:
      "Plan around your energy, not against it. A calm, shame-free planner for neurodivergent students.",
    siteName: "MindFlow",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f0" },
    { media: "(prefers-color-scheme: dark)", color: "#262220" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
