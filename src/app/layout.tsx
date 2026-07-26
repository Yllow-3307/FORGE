import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "@/components/theme";
import { Navigation } from "@/components/navigation";
import { GestionPWA } from "@/components/pwa";
import { FournisseurAuth } from "@/lib/auth";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Callisthenic — Programmes personnalisés",
    template: "%s · Callisthenic",
  },
  description:
    "Générateur de programmes de callisthénie, endurance, nutrition et hydratation, "
    + "calculés à partir du profil, de l'agenda et du matériel disponible.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Callisthenic",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icones/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // L'application est dense : on autorise le zoom, indispensable pour
  // l'accessibilité, mais on évite le zoom involontaire au double-tap.
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eceae4" },
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
        <FournisseurAuth>
          <ThemeProvider>
            <Navigation />
            {/* pb-28 : dégage la barre de navigation mobile fixée en bas.
                Les marges « safe-area » évitent l'encoche et la barre
                gestuelle sur iPhone en mode installé. */}
            <main
              className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-16"
              style={{
                paddingLeft: "max(1rem, env(safe-area-inset-left))",
                paddingRight: "max(1rem, env(safe-area-inset-right))",
              }}
            >
              {children}
            </main>
            <GestionPWA />
          </ThemeProvider>
        </FournisseurAuth>
      </body>
    </html>
  );
}
