import type { Metadata, Viewport } from "next";
import "@fontsource-variable/vazirmatn";
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";
import { I18nProvider } from "@/components/i18n";
import { dirOf } from "@/lib/i18n";
import { getLang, getTheme } from "@/lib/server-i18n";

export const metadata: Metadata = {
  title: { default: "IELTS Vocab", template: "%s · IELTS Vocab" },
  description: "Save IELTS vocabulary with Persian translations and practice it with spaced repetition.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Applies the saved theme (or the device preference) before first paint to avoid a flash.
const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(\\w+)/);var t=m?m[1]:'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, theme] = await Promise.all([getLang(), getTheme()]);
  return (
    <html lang={lang} dir={dirOf(lang)} className={theme === "dark" ? "dark" : ""} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
          {lang === "fa" ? "رفتن به محتوا" : "Skip to content"}
        </a>
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
