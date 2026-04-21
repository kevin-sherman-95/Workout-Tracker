import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

/** Runs before first paint; syncs saved theme with <html class="dark">. Static string only. */
const themeInitScript = `(function(){try{var k='workout-tracker-theme';var t=localStorage.getItem(k);var d=document.documentElement;if(t==='light'){d.classList.remove('dark');}else if(t==='dark'){d.classList.add('dark');}else if(t==='system'){if(window.matchMedia('(prefers-color-scheme: dark)').matches)d.classList.add('dark');else d.classList.remove('dark');}else{d.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`;

export const metadata: Metadata = {
  title: "Workout Tracker",
  description: "Track your gym workouts and progress",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          // eslint-disable-next-line react/no-danger -- tiny static boot script; no user HTML
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <Auth0Provider>{children}</Auth0Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
