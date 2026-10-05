import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Providers from "@/components/Providers";
import { HTML_LANG } from "@/lib/i18n/config";
import { getLocale, getMessages } from "@/lib/i18n/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#183B8F",
};

export const metadata: Metadata = {
  title: "ALshowUhow — Find Local Service Providers",
  description: "Tell us what you need and we'll connect you with qualified local service providers. Free for customers.",
};

// Reads the locale cookie, so every page renders in the visitor's language on the
// first paint. Also opts the whole app out of static prerendering, which the home
// page already required for its database reads.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    // lang must follow the locale, not stay hardcoded "en": screen readers pick a
    // pronunciation voice from it, and Spanish read with an English voice is
    // unintelligible.
    <html
      lang={HTML_LANG[locale]}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers locale={locale} messages={messages}>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
