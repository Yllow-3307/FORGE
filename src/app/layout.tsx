import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "@/components/theme";
import { Navigation } from "@/components/navigation";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Callisthenic — Programmes personnalisés",
  description:
    "Générateur de programmes de callisthénie, endurance, nutrition et hydratation, "
    + "calculés à partir du profil, de l'agenda et du matériel disponible.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0ebeb" },
    { media: "(prefers-color-scheme: dark)", color: "#141d1d" },
  ],
};

/**
 * Applique le thème avant le premier rendu pour éviter un flash clair
 * au chargement d'une page en mode sombre.
 */
const SCRIPT_THEME = `
(function(){
  try {
    var t = localStorage.getItem("callisthenic-theme");
    if (!t) t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    if (t === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body className={`${geist.variable} antialiased`}>
        <ThemeProvider>
          <Navigation />
          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-16">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
